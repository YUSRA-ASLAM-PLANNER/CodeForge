import test from "node:test";
import assert from "node:assert/strict";
import { duplicateFileNodesRule } from "../src/rules";

test("ARCH-004 passes when file nodes are unique", () => {
  const violations = duplicateFileNodesRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-004 detects duplicate file nodes", () => {
  const violations = duplicateFileNodesRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:src/index.ts#duplicate",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-004");
  assert.equal(violations[0].target, "src/index.ts");
});
