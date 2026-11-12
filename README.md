# CodeForge

CodeForge is a repository analysis and architectural verification project designed to help developers identify architectural integrity issues in software codebases.

## Current Capabilities

- Repository indexing and import extraction.
- Root and nested `.gitignore` rules, including negated patterns.
- Supported TypeScript/JavaScript and Python import resolution.
- npm workspace package names resolve to their indexed source entries.
- TypeScript/JavaScript AST symbol indexing with imported call references.
- Context-graph construction.
- Architectural verification.
- Circular dependency detection.
- Direct and transitive dependency impact for a changed file.
- A separate analysis engine that creates deterministic evidence, invokes
  Chapter 14 evaluation, and persists findings in a hash-chained WAL.

## Project Structure

```text
CodeForge/
|-- apps/
|-- packages/
|   |-- analysis-engine/
|   |-- context-graph/
|   |-- evaluation-engine/
|   |-- repository-indexer/
|   |-- verification-engine/
|-- .codeforge.yaml or codeforge.config.json
|-- package.json
|-- package-lock.json
```

## Requirements

- Node.js
- npm
- Python is optional; it enables full AST-based Python symbol/call analysis.

## Getting Started

Install dependencies:

```powershell
npm.cmd install
```

Build the workspaces:

```powershell
npm.cmd run build
```

Scaffold CodeForge config and an analysis specification in a repository that
does not already have them:

```powershell
node packages/analysis-engine/dist/src/cli.js init .
```

The command creates `.codeforge.yaml` and `codeforge-spec.json`; it stops
if either file already exists. Then run verification and analysis:

```powershell
node packages/analysis-engine/dist/src/cli.js verify .
node packages/analysis-engine/dist/src/cli.js analyze . --spec .\codeforge-spec.json
```

Run tests:

```powershell
npm.cmd test
```

## Verify a Repository

Build the workspaces (the command uses both engines):

```powershell
npm.cmd run build
```

Verify the current repository:

```powershell
node packages/analysis-engine/dist/src/cli.js verify .
```

To verify another repository, pass its actual directory path (quote it if it
contains spaces), or change into that directory and use `.`. The repository
path is optional and defaults to the current directory. Use `--help` for
command usage. Verification results can be emitted as JSON for
scripts and CI:

```powershell
node packages/analysis-engine/dist/src/cli.js verify . --format json
```

The command exits with code `0` when verification passes, `2` when it finds
violations, and `1` when it cannot run because of invalid arguments,
configuration, or repository access errors.

To see which CodeForge files depend on a changed file, run the impact command
with a real file path from the repository:

```powershell
node packages/analysis-engine/dist/src/cli.js impact packages/repository-indexer/src/index.ts . --format json
```

The report separates direct dependents from files affected transitively and
shows a dependency chain for each result. It uses indexed import edges and
cross-file call references, and does not write to the analyzed repository.

The indexer honors root and nested `.gitignore` files. It also skips common
generated and dependency directories such as `.git`, `node_modules`, and
`dist`, and does not follow symlinks. If a repository directory or source file
cannot be read, indexing stops with an error instead of reporting a partial
scan as complete.

Run the complete analysis pipeline with a Chapter 14 specification:

```powershell
node packages/analysis-engine/dist/src/cli.js analyze . --spec .\analysis-spec.json --format json
```

The command generates evidence, evaluates criteria, and persists findings in
`.codeforge/findings.wal.jsonl` by default. The specification format is
documented in [ANALYSIS_SPECIFICATION.md](docs/ANALYSIS_SPECIFICATION.md).

## Configuration

The root `.codeforge.yaml` can enable automatic layer detection, define
prohibited import boundaries, and exclude repository-root-relative paths from
scanning. Existing `codeforge.config.json` files remain supported. See the [configuration reference and
rule catalog](docs/VERIFICATION_RULES.md) for the available fields and checks.
Run `forge verify . --format json` to inspect detected layers and the effective
boundaries that ARCH-024 enforces.

## Product Scope and Development Status

The current implementation is a command-line development prototype with a
programmatic analysis pipeline. The approved product direction also includes
IDE feedback and CI verification, plus deeper AST and
dependency analysis; those integrations and capabilities are not complete.
The [product readiness plan](docs/PRODUCT_READINESS.md) tracks the difference
between the target product and what this checkout currently implements.
The indexer's reproducible synthetic benchmark and initial measurements are in
[PERFORMANCE.md](docs/PERFORMANCE.md).

The project CI workflow runs the full workspace suite and self-verification on
Windows and Ubuntu with Node.js 22 and 24. It also runs the analysis CLI against
CodeForge itself through the reusable composite action after installing
dependencies from the lockfile. See the [GitHub Action guide](docs/GITHUB_ACTION.md)
for its inputs and current release limitations.

The currently supported languages, import resolution behavior, and
verification rules are those implemented in the packages listed above.

## License

No license has been specified yet.
