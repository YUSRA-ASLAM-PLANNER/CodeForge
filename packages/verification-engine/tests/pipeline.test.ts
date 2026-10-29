import test from "node:test";
import assert from "node:assert/strict";
import { verifyRepository } from "../src/pipeline";

test("repository verification pipeline detects graph violations", () => {
  const result = verifyRepository(
    {
      rootPath: ".",
      files: [
        {
          path: "src/index.ts",
          extension: ".ts",
          sizeBytes: 100
        }
      ],
      fileCount: 1,
      totalBytes: 100
    },
    {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "src/index.ts",
          path: "src/index.ts"
        }
      ],
      edges: [
        {
          from: "file:src/index.ts",
          to: "file:missing.ts",
          kind: "imports"
        }
      ]
    }
  );

  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 2);
  assert.equal(result.violations[0].ruleId, "ARCH-001");
});

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { indexRepository } from "@codeforge/repository-indexer";
import { buildContextGraphFromSnapshot } from "@codeforge/context-graph";

test("pipeline detects circular dependencies between indexed Python files", async () => {
  const root = await mkdtemp(join(tmpdir(), "codeforge-python-cycle-"));

  await mkdir(join(root, "src"), { recursive: true });

  await writeFile(
    join(root, "src", "a.py"),
    "from src.b import helper\n"
  );
  await writeFile(
    join(root, "src", "b.py"),
    "from src.a import helper\n"
  );

  const snapshot = await indexRepository(root);
  const graph = buildContextGraphFromSnapshot(snapshot);
  const result = verifyRepository(snapshot, graph);

  assert.ok(
    result.violations.some((violation) => violation.ruleId === "ARCH-026"),
    "Expected ARCH-026 to detect the Python circular dependency"
  );
});
