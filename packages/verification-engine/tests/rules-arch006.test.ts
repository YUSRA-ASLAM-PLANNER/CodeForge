import test from "node:test";
import assert from "node:assert/strict";
import { fileNodesRequireValidPathsRule } from "../src/rules";

test("ARCH-006 passes when every file node has a valid path", () => {
  const violations = fileNodesRequireValidPathsRule.check({
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

test("ARCH-006 detects a file node with missing path", () => {
  const violations = fileNodesRequireValidPathsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:missing",
          kind: "file",
          label: "missing"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-006");
});

test("ARCH-006 detects a file node with empty path", () => {
  const violations = fileNodesRequireValidPathsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:empty",
          kind: "file",
          label: "empty",
          path: "   "
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-006");
});
