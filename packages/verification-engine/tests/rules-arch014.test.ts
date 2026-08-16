import test from "node:test";
import assert from "node:assert/strict";
import { repositoryContainsAllTopLevelFilesRule } from "../src/rules";

test("ARCH-014 passes when repository node is connected to every top-level file", () => {
  const violations = repositoryContainsAllTopLevelFilesRule.check({
    files: ["index.ts", "rules.ts"],
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
        },
        {
          id: "file:rules.ts",
          kind: "file",
          label: "rules.ts",
          path: "rules.ts"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "file:index.ts",
          kind: "contains"
        },
        {
          from: "repository:root",
          to: "file:rules.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-014 detects a top-level file not connected to repository", () => {
  const violations = repositoryContainsAllTopLevelFilesRule.check({
    files: ["index.ts", "rules.ts"],
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
        },
        {
          id: "file:rules.ts",
          kind: "file",
          label: "rules.ts",
          path: "rules.ts"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "file:index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-014");
  assert.equal(violations[0].target, "file:rules.ts");
});