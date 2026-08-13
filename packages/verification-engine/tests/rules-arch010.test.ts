import test from "node:test";
import assert from "node:assert/strict";
import { repositoryNodeMustBeRootRule } from "../src/rules";

test("ARCH-010 passes when repository node has no incoming edges", () => {
  const violations = repositoryNodeMustBeRootRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-010 detects an incoming edge to repository node", () => {
  const violations = repositoryNodeMustBeRootRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "index.ts"
        }
      ],
      edges: [
        {
          from: "file:index.ts",
          to: "repository:root",
          kind: "references"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-010");
});
