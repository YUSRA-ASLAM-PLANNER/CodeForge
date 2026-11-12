# GitHub Action

CodeForge provides a composite action in the repository root `action.yml`.
The action installs and builds CodeForge, then either verifies a repository or
analyzes it using a Chapter 14 JSON specification.

## Inputs

| Input | Default | Purpose |
| --- | --- | --- |
| `repository-path` | `.` | Repository path, relative to the workflow workspace or absolute. |
| `spec` | empty | Specification path. When set, runs `analyze`; otherwise runs `verify`. |
| `format` | `text` | CLI output format: `text` or `json`. |
| `node-version` | `24` | Node.js used to build CodeForge. |
| `python-version` | `3.12` | Python used for Python AST analysis. |

The caller must check out the repository to analyze before using the action.
The CLI runs from the workflow workspace, so relative repository and spec paths
are resolved from that directory. Analysis findings are written to the runner's
temporary directory; the action does not create a WAL inside the analyzed
repository.

## Use in this repository

The CodeForge CI workflow exercises the action against CodeForge itself:

```yaml
- uses: ./
  with:
    repository-path: .
    spec: examples/analysis-spec.json
```

For another repository, reference the CodeForge repository and a release ref in
the consumer workflow. This checkout does not yet define a published release
tag, so an external `uses: owner/repository@ref` value is not available yet.

When verification finds violations, or analysis returns a Non-Conforming
finding, the CLI exits with code 2 and the action step fails. Invalid setup or
repository access errors exit with code 1.
