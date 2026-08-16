import test from "node:test";
import assert from "node:assert/strict";
import { directoryNodesRequireValidPathsRule } from "../src/rules";

test("ARCH-015 passes when every directory node has a valid path", () => {
  const violations = directoryNodesRequireValidPathsRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "directory:src",
          kind: "directory",
          label: "src",
          path: "src"
        },
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "directory:src",
          kind: "contains"
        },
        {
          from: "directory:src",
          to: "file:src/index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-015 detects a directory node with missing path", () => {
  const violations = directoryNodesRequireValidPathsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "directory:src",
          kind: "directory",
          label: "src"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "directory:src",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-015");
  assert.equal(violations[0].target, "directory:src");
});

test("ARCH-015 detects a directory node with empty path", () => {
  const violations = directoryNodesRequireValidPathsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "directory:src",
          kind: "directory",
          label: "src",
          path: "   "
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "directory:src",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-015");
  assert.equal(violations[0].target, "directory:src");
});
