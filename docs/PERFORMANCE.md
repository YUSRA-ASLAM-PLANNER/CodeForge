# Indexer performance

## Reproduce

From the repository root, run:

```powershell
npm.cmd run benchmark:indexer
```

The benchmark creates temporary TypeScript repositories with 100, 500, and
1,000 files. Each file declares one function; all but the first import and call
the preceding file's function. It runs one warm-up and five measured
`indexRepository` scans per size, forcing garbage collection between runs, and
reports each sample plus min/median/max. Temporary repositories are removed
when the run finishes.

To include the larger scale scenario, run:

```powershell
npm.cmd run benchmark:indexer -- --large
```

This adds 500 files totaling 5 million source lines. Each file has one small
function and comment filler for the remaining lines. It measures the indexer
only, not graph construction, evaluation, or a representative source-code mix.

To measure a more AST-heavy fixture, run:

```powershell
npm.cmd run benchmark:indexer -- --ast-heavy
```

This adds 500 files and 1 million source lines, with 100 function declarations
per file (50,000 symbols total). It reports three measured scans after a
warm-up.

## Initial measurement

Measured on Windows with Node.js v24.19.0 on 2026-11-12. The indexer returned
the expected symbol and call counts at every size.

| Files | Source bytes | Earlier baseline | Latest median | Latest throughput |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 9,247 | 390 ms | 51.79 ms | 1,931 files/s |
| 500 | 46,447 | 847 ms | 217.16 ms | 2,302 files/s |
| 1,000 | 92,947 | 1,202 ms | 479.92 ms | 2,084 files/s |

The earlier baseline used three runs with no warm-up; the current script uses
warm-up, five samples, and forced garbage collection, so the comparison is
indicative rather than a controlled before/after experiment. Current 1,000-file
samples ranged from 424 ms to 1,700 ms across recent runs, although the latest
five-sample run ranged from 471 ms to 568 ms. The benchmark has no hardware
isolation, so variance still needs investigation before these figures support
a release claim.

The latest opt-in 5-million-line comment-heavy indexer run completed in
1,328.81 ms (100,026,467 source bytes, about 3.76 million lines/s). Its wall
time was mainly in repository walking/reading (1,208 ms); AST parsing accounted
for about 1,004 ms of cumulative synchronous parsing work. The 1-million-line
AST-heavy fixture completed in a median 819 ms, including 583 ms of AST parsing
work and 92 ms resolving calls. These stage measurements help find bottlenecks;
the source-I/O stage is cumulative across concurrent workers and can exceed
total wall time.

These runs confirm the indexer can process the given synthetic shapes; they do not
establish the PRD's 5-million-LOC product target for normal source code or the
complete analysis pipeline.

## Complete analysis pipeline

Run `npm.cmd run benchmark:analysis` to measure the indexer and `analyzeRepository`
against temporary multi-package TypeScript repositories. Each size has one warm-up
and three measured runs. The complete path includes repository indexing, graph
construction, architecture verification, evidence creation, Chapter 14 validation
and evaluation, and WAL persistence. Every synthetic run must pass verification.

Measured on the same Windows/Node.js environment on 2026-11-12:

| Files | Packages | Indexer median | Full pipeline median | Findings |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 2 | 56.61 ms | 110.80 ms | 101 |
| 500 | 10 | 166.94 ms | 263.00 ms | 501 |
| 1,000 | 20 | 585.82 ms | 751.19 ms | 1,001 |

Before batching WAL writes, the same 1,000-file scenario took 8,761.50 ms at the
median. Analysis had reloaded and validated the complete log once for every finding.
The batch path validates the existing chain once, retains the same finding ID
conflict checks and record hash chain, writes records in the original order, and
fsyncs once for the batch. A repeat analysis still skips identical persisted
findings. This is a synthetic workload with one root-scoped criterion; it is not a
claim about performance for large real repositories or many criteria. The 100- and
500-file results also vary with machine load, so use these as development
measurements rather than release guarantees.

## CodeForge self-analysis

The CLI was run against the actual CodeForge checkout with the repository's
`examples/analysis-spec.json`. Three fresh WAL files were used so every run
included durable writes for its findings. The full process was timed from
PowerShell, including Node startup:

```powershell
$samples = @()
for ($i = 0; $i -lt 3; $i++) {
  $wal = Join-Path $env:TEMP ("codeforge-self-$i.wal.jsonl")
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  node packages/analysis-engine/dist/src/cli.js analyze . `
    --spec examples/analysis-spec.json --wal $wal --format text
  $sw.Stop()
  $samples += [math]::Round($sw.Elapsed.TotalMilliseconds, 2)
}
$samples
```

On Windows with Node.js v24.19.0, the results were 1,385.18 ms, 1,315.60 ms,
and 1,377.48 ms (median 1,377.48 ms). All three CLI runs exited 0 and produced
253 evidence items and 126 findings (1 Conforming, 125 Not Applicable). The
independent `forge verify . --format json` check passed with zero violations.
This measures the current CodeForge checkout, not an independently selected
customer monorepo; representative external repositories are still needed before
making a general performance claim.

The change removes a full TypeScript program build from each scan, extracts
imports and symbols in one AST pass, reads directory entries with bounded
concurrency, and avoids a separate metadata `stat` for source files. These
measurements do not cover incremental IDE latency or representative monorepos;
those remain release gates.
