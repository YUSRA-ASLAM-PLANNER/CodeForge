import test from "node:test";
import assert from "node:assert/strict";
import { duplicateNodeIdsRule } from "../src/rules";

test("ARCH-005 passes when all context graph node IDs are unique", () => {
  const violations = duplicateNodeIdsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:app.ts",
          kind: "file",
          label: "app.ts",
          path: "src/app.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-005 detects duplicate context graph node IDs", () => {
  const violations = duplicateNodeIdsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:index.ts",
          kind: "file",
          label: "another-index.ts",
          path: "src/another-index.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-005");
  assert.equal(violations[0].target, "file:index.ts");
});

