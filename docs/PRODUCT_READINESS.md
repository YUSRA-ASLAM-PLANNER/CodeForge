# CodeForge product readiness

## Current product definition

CodeForge's approved product direction is an out-of-band, local-first
Architectural Verification and Static Analysis Engine for AI-generated and
human-written changes. The CLI is the current development interface, not the
complete product. The product direction includes TypeScript/JavaScript and
Python AST analysis, repository-level dependency graphs, declarative
architecture rules, IDE feedback, and CI verification. The PRD also names
blast-radius analysis; a first CLI impact report is now implemented.

## Current state

- Repository indexer, context graph, verification engine, evaluation engine,
  and analysis engine are separate npm workspaces.
- The indexer extracts imports from TypeScript/JavaScript and Python files.
  It resolves named npm workspace packages to indexed source entry points.
  For TypeScript/JavaScript it also extracts AST declarations and function/
  method calls into symbol nodes and reference edges, including calls to
  imported declarations in indexed files. Python AST analysis uses the local
  Python interpreter when available and reports parse/runtime warnings;
  richer module semantics and broader call resolution remain outstanding.
- The verification engine checks graph integrity, unresolved internal imports,
  configured architecture boundaries, and circular imports.
- The new analysis engine composes repository discovery, graph verification,
  deterministic structural/dependency/configuration evidence, Chapter 14
  validation/evaluation, and hash-chained finding persistence. It produces
  repository-level and per-file artifacts and keeps the Chapter 14 evaluator
  as the authority for findings. Per-file evidence includes indexed symbols
  and calls, while repository evidence includes cross-file call edges.
- The indexer honors root and nested `.gitignore` rules, including negation.
  It skips common generated/dependency directories, does not follow symlinks,
  and fails with a path-specific error if it cannot read repository content.
- Architecture configuration supports recommended `.codeforge.yaml` and the
  legacy `codeforge.config.json`; defining both is an error. `forge init`
  generates YAML and a starter analysis specification. `scan.exclude` adds
  repository-root-relative exclusions that apply to verification and analysis.
- `forge verify [repository-path]` retains the architecture verifier, and
  `forge analyze [repository-path] --spec <file>` now runs verification,
  evidence generation, Chapter 14 evaluation, and WAL persistence. Both support
  JSON output; the analysis command is documented in
  `docs/ANALYSIS_SPECIFICATION.md`.
- `forge impact <file-path> [repository-path]` reports direct and transitive
  dependents using reverse import edges and cross-file call references, with a
  chain explaining each result. It reports indexed dependencies only; runtime
  and dynamic dependency discovery are not included.
- CLI coverage includes help, missing specification handling, JSON analysis,
  repeat-run WAL idempotency, verification results, impact reports, and exit
  codes.
- The full workspace suite passes: 209 tests, 0 failures. The TypeScript builds
  run as part of those workspace test scripts.
- Manual CLI smoke checks passed for help output, JSON verification, and full
  analysis of CodeForge itself: verification passed, the repository-scoped
  criterion was Conforming, and findings were persisted to the default WAL.
- The verifier also passed against the separate local Chapter 14 evaluation
  engine repository with exit code 0 and zero violations. This checks a second
  real codebase, but does not replace representative external monorepo or
  automatic-boundary false-positive validation.
- Real-repository release check: CodeForge verifies itself with zero violations;
  three CLI analysis runs each produced 253 evidence items and 126 findings,
  passed with exit code 0, and had a 1,377 ms median including process startup.
  Results and a reproduction command are in `docs/PERFORMANCE.md`.
- Self-inspection confirms no built-in architecture layers are present in
  CodeForge itself; its two explicit configured boundaries remain effective.

Earlier reports described a dedicated AST evidence producer as complete. The
current pipeline does include AST-derived symbol and call evidence, including
cross-file call edges, but richer semantic analysis and broader language
coverage remain outstanding. The context builder/orchestrator was also added
in this checkout through the analysis-engine integration.

## Release gates

1. **CLI behavior and regression check**
   - Complete: workspace tests pass (209/209); help, clean JSON result,
     missing-repository access error, violation result/exit code 2, and
     invalid-format exit code 1 are covered.
   - Remaining: test an actual permission-denied repository and verify on a
     clean checkout before release.

2. **Repository scanning policy**
   - Implemented and covered: root and nested `.gitignore` rules, including
     negations; configurable `scan.exclude` patterns; default exclusions for
     common generated/dependency directories;
     symlinks are not followed; unreadable content stops the scan with a
     path-specific error.
   - Synthetic indexer and full-pipeline benchmarks report warm-up and repeated
     timing samples for 100, 500, and 1,000 TypeScript files, with optional
     1-million-line
     AST-heavy and 5-million-line comment-heavy fixtures.
   - Latest medians: 480 ms for 1,000 small files, 819 ms for the
     1-million-line AST-heavy fixture, 1.33 seconds for the 5-million-line
     comment-heavy indexer scan, and 751 ms for complete analysis of a
     1,000-file synthetic monorepo.
   - Full-pipeline timing exposed repeated WAL reloads per finding; batch
     persistence now validates once and preserves chained hashes and
     idempotency. The 1,000-file full-analysis median moved from 8.76 seconds
     to 751 ms in the latest benchmark run (the prior run measured 665 ms).
   - Timing varies across runs; representative monorepo and 5-million-LOC
     complete-pipeline benchmarks remain release gates.
   - Remaining: representative external monorepo benchmarks and incremental
     IDE latency.

3. **Configuration and findings**
   - Implemented: `.codeforge.yaml` is the recommended configuration format;
     existing `codeforge.config.json` files remain supported. The initializer
     creates YAML, rejects conflicting config files, and the verifier reports
     which source it loaded. Config fields and rules are documented in
     `docs/VERIFICATION_RULES.md`; configured layer names are normalized.
     JSON verification reports detected layers,
     suggested and active automatic boundaries, configured boundaries and
     their source, and the effective boundary list. Detection ignores package
     internals and focuses on built-in or explicitly configured layer names.
   - Remaining: review false-positive behavior for automatic architecture
     boundaries against representative repositories.

4. **Repository analysis and evidence integration**
   - Implemented: `@codeforge/analysis-engine` provides deterministic
     orchestration and evidence production from the current repository index,
     dependency graph, and architectural verifier into Chapter 14. Integration
     coverage verifies evidence integrity, carries unresolved import findings,
     and confirms WAL idempotency on repeat runs.
   - Implemented: `forge init [repository-path]` creates starter architecture
     configuration and a valid Chapter 14 specification without overwriting
     existing files. Its generated spec is covered by an end-to-end analyze
     test.
   - Remaining: richer AST-derived evidence, an interactive specification
     editor, and project-specific criteria templates.

5. **PRD product integrations and targets**
   - Implemented: a reusable composite GitHub Action can verify or analyze a
     checked-out repository. CodeForge's own workflow exercises it on Windows
     and Ubuntu with Node.js 22 and 24, then runs the full workspace suite.
   - Remaining before external use: choose a public or otherwise accessible
     repository and release ref for the action. VS Code feedback,
     benchmark evidence for latency, scale, parse success, graph accuracy, and
     false-positive targets also remain.
   - These are product acceptance criteria, not implied by the current passing
     unit suite.

6. **Distribution and release acceptance**
   - The workspaces are currently private, and no release workflow or license
     is defined.
   - Before release, add versioning and installation/release instructions,
     then run the full suite from a clean checkout on Windows and one
     Unix-like environment.

## Working rule

Keep changes small and tied to one release gate. Do not remove local backups or
rewrite generated artifacts by hand. Update the documented state only after
there is command output or another reproducible check to support it.
