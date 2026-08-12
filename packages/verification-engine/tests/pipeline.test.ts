import test from "node:test";
import assert from "node:assert/strict";
import { verifyRepository } from "../src/pipeline";

test("repository verification pipeline detects graph violations", () => {
  const result = verifyRepository(
    {
      files: ["src/index.ts"]
    },
    {
      nodes: [
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        }
      ],
      edges: [
        {
          from: "file:index.ts",
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
