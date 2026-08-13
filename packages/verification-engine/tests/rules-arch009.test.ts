import test from "node:test";
import assert from "node:assert/strict";
import { repositoryNodeIdRule } from "../src/rules";

test("ARCH-009 passes when repository node uses canonical ID", () => {
  const violations = repositoryNodeIdRule.check({
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

test("ARCH-009 detects repository node with invalid ID", () => {
  const violations = repositoryNodeIdRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:wrong",
          kind: "repository",
          label: "CodeForge"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-009");
});
