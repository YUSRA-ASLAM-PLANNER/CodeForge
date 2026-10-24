import test from "node:test";
import assert from "node:assert/strict";
import { repositoryNodeRequiredRule } from "../src/rules";

test("ARCH-008 passes when exactly one repository node exists", () => {
  const violations = repositoryNodeRequiredRule.check({
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

test("ARCH-008 reports the correct rule ID when repository node is missing", () => {
  const violations = repositoryNodeRequiredRule.check({
    files: [],
    graph: {
      nodes: [],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-008");
});

test("ARCH-008 detects multiple repository nodes", () => {
  const violations = repositoryNodeRequiredRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "repository:second",
          kind: "repository",
          label: "Another repository"
        }
      ],
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-008");
});