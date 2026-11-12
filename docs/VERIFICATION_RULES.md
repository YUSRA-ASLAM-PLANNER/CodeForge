# Verification rules and configuration

## Configuration

Place `.codeforge.yaml` at the root of the repository being analyzed. The file
is optional. With no file, automatic layer detection is enabled and there are
no additional configured boundaries.

```yaml
architecture:
  autoDetectLayers: true
  importBoundaries:
    - from: ui
      to: database
    - from: ui
      to: infrastructure
scan:
  exclude:
    - generated/
    - coverage/**
```

The existing `codeforge.config.json` format remains supported. Do not keep both
files in one repository; CodeForge reports an error rather than guessing which
configuration should take precedence.

- `architecture.autoDetectLayers` (boolean, default `true`) looks beneath
  `src/` for layer directories and enables built-in prohibited directions when
  both layers are present. Set it to `false` to disable those automatic
  boundaries.
- `architecture.importBoundaries` (array, default `[]`) adds explicit
  prohibited import directions. Each item needs non-empty `from` and `to`
  layer names. Matching is case-insensitive; surrounding whitespace is
  trimmed.
- Explicit boundaries remain active when automatic detection is disabled.
- `scan.exclude` (array, default `[]`) adds repository-root-relative ignore
  patterns to the built-in exclusions and `.gitignore` rules. Use patterns such
  as `generated/` or `coverage/**`. Exclusions cannot be negated, so configured
  paths stay out of the index and analysis.
- Malformed configuration or invalid field types stop verification with an
  error.

To review the configuration that CodeForge actually applied, run verification
with JSON output:

```powershell
node packages/verification-engine/dist/src/cli.js verify . --format json
```

The `architecture` object in the result reports whether automatic detection is
enabled, each detected layer's file count and up to three example paths,
suggested automatic boundaries, active automatic boundaries, configured
boundaries and their source (`.codeforge.yaml`, `codeforge.config.json`, or
analysis options), and the final effective boundary list. The
`effectiveBoundaries` list is the set used by ARCH-024. To override automatic
rules, set `autoDetectLayers` to `false`; any `importBoundaries` you define
continue to apply.

Layer detection examines directories directly below `src/` components in a
file path. It reports built-in names (`ui`, `database`, `infrastructure`, and
`presentation`) plus endpoints named in configured boundaries. Other folders,
such as `canonicalization` or `persistence`, are treated as package internals
and are not reported as architecture layers. Explicit custom boundary names
are eligible for detection, but CodeForge does not invent prohibited directions
for them; define those directions in `importBoundaries`.

## Rules

All reported violations currently have severity `error`.

| Rule | Check |
| --- | --- |
| ARCH-001 | Every graph edge references existing source and target nodes. |
| ARCH-002 | Every indexed repository file has a graph node. |
| ARCH-003 | Every file node corresponds to an indexed repository file. |
| ARCH-004 | There is at most one file node per repository path. |
| ARCH-005 | Graph node IDs are unique. |
| ARCH-006 | Every file node has a non-empty path. |
| ARCH-007 | Graph edges use `contains`, `imports`, `exports`, or `references`. |
| ARCH-008 | The graph has exactly one repository node. |
| ARCH-009 | The repository node ID is `repository:root`. |
| ARCH-010 | The repository node has no incoming edges. |
| ARCH-011 | No graph edge connects a node to itself. |
| ARCH-012 | Edges are unique by source, target, and kind. |
| ARCH-013 | Every non-repository node connects to at least one edge. |
| ARCH-014 | Every top-level file node is contained by the repository node. |
| ARCH-015 | Every directory node has a non-empty path. |
| ARCH-016 | Every directory node has a `contains` edge from its parent. |
| ARCH-017 | Every file node has a `contains` edge from its parent. |
| ARCH-018 | `contains` edges connect valid parent and child node kinds. |
| ARCH-019 | Directory and file `contains` edges match parent-child paths. |
| ARCH-020 | Every file node matches a file in the repository index. |
| ARCH-021 | Every directory node is represented by an indexed file path. |
| ARCH-022 | Directory and file containment edges match their path hierarchy. |
| ARCH-023 | Relative internal imports resolve to indexed source files. |
| ARCH-024 | Imports do not cross a configured prohibited architecture boundary. |
| ARCH-026 | Repository files do not form circular import dependencies. |

ARCH-023 resolves TypeScript/JavaScript extensions and directory indexes, plus
Python modules, stubs, and package initializers. Import aliases are resolved
when the repository's TypeScript configuration maps them to indexed files.

The rule IDs currently skip ARCH-025; no ARCH-025 rule is registered in the
verification pipeline.
