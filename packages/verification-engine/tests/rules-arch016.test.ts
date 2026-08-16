import test from "node:test";
import assert from "node:assert/strict";
import { directoryNodesRequireParentRule } from "../src/rules";

test("ARCH-016 passes when every directory has a parent contains edge", () => {
  const violations = directoryNodesRequireParentRule.check({
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
          path: "src"
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

  assert.equal(violations.length, 0);
});

test("ARCH-016 detects a directory without a parent contains edge", () => {
  const violations = directoryNodesRequireParentRule.check({
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
          path: "src"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-016");
  assert.equal(violations[0].target, "directory:src");
});