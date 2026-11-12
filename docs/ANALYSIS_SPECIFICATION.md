# Analysis specification

Use `forge analyze <repository-path> --spec <file>` to turn the current
repository scan into evidence and Chapter 14 findings. A specification file is
JSON and contains the Chapter 14 `requirements`, `criteria`, and
`evidence_requirements` arrays. `traceability_links` is optional. The analysis
engine validates both schema and referential integrity before evaluating.

## Dependency impact

Use `forge impact <file-path> [repository-path] [--format text|json]` to list
the files affected by a change to one indexed file. The file path is relative to
the repository root; the repository path defaults to the current directory.
Impact follows reverse import dependencies and cross-file call references,
reports direct and transitive dependents separately, and shows a dependency
chain explaining each result. The command reads the repository without writing
findings or other files.

From the CodeForge repository root, for example:

```powershell
node packages/analysis-engine/dist/src/cli.js impact packages/repository-indexer/src/index.ts . --format json
```

For a new repository, scaffold a starting configuration and specification with:

```powershell
node packages/analysis-engine/dist/src/cli.js init .
```

This creates `.codeforge.yaml` and `codeforge-spec.json` in the selected
existing directory. It refuses to overwrite either file. Edit the generated
specification to add requirements and criteria relevant to your project.

## Minimal example

```json
{
  "requirements": [
    {
      "requirement_id": "REQ-ARCH-001",
      "title": "Repository architecture checks pass",
      "constraint_level": "Foundational"
    }
  ],
  "criteria": [
    {
      "criterion_id": "CRIT-ARCH-001",
      "requirement_id": "REQ-ARCH-001",
      "definition": "The repository has no architectural verification violations.",
      "structured_predicate": {
        "type": "ATTRIBUTE_EQUALS",
        "evidence_class": "Structural",
        "attribute": "verification_passed",
        "expected": true
      },
      "applicability": {
        "artifact_ids": ["repository:root"]
      }
    }
  ],
  "evidence_requirements": [
    {
      "evidence_requirement_id": "ER-ARCH-001",
      "criterion_id": "CRIT-ARCH-001",
      "evidence_class": "Structural",
      "sufficiency_conditions": [
        { "type": "MIN_COUNT", "evidence_class": "Structural", "min_count": 1 }
      ]
    }
  ]
}
```

Save it as `analysis-spec.json`, then run:

```powershell
npm.cmd run build
node packages/analysis-engine/dist/src/cli.js analyze . --spec .\analysis-spec.json --format json
```

The CLI uses the stable baseline ID `BASE-LOCAL`. Findings are stored in
`.codeforge/findings.wal.jsonl`; pass `--wal <path>` to select another location.
The WAL is created inside the analyzed repository when a relative path is used.

`--format json` returns verification status and violations, finding counts and
details, evidence count, and persistence counts. Exit code `0` means
verification passed and there are no Non-Conforming findings. Exit code `2`
means verification found violations or at least one finding is
Non-Conforming. Exit code `1` means the command or its input could not be
processed. Insufficient Evidence findings are reported in output and do not by
themselves produce exit code `2`.

The CLI accepts Chapter 14 specification structures directly and provides a
starter scaffold. It does not yet provide an interactive specification editor
or project-specific criteria templates.
