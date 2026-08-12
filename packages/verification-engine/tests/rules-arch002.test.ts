import test from "node:test";
import assert from "node:assert/strict";
import { indexedFilesExistInContextGraphRule } from "../src/rules";

test("ARCH-002 passes when every indexed file exists in context graph", () => {
  const violations = indexedFilesExistInContextGraphRule.check({
    files: [
      "src/index.ts",
      "src/app.ts"
    ],
    graph: {
      nodes: [
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "src/index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:src/app.ts",
          kind: "file",
          label: "src/app.ts",
          path: "src/app.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-002 detects an indexed file missing from context graph", () => {
  const violations = indexedFilesExistInContextGraphRule.check({
    files: [
      "src/index.ts",
      "src/missing.ts"
    ],
    graph: {
      nodes: [
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "src/index.ts",
          path: "src/index.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-002");
  assert.equal(violations[0].target, "src/missing.ts");
});
