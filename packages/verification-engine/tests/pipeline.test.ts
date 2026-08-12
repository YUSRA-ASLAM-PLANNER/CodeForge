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
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].ruleId, "ARCH-001");
});
