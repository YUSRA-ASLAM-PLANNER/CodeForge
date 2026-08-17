import assert from "node:assert/strict";
import test from "node:test";
import { directoryNodesMustMatchRepositoryStructureRule } from "../src/rules";

test("ARCH-021 passes when every directory exists in repository structure", () => {
  const violations = directoryNodesMustMatchRepositoryStructureRule.check({
    files: ["src/index.ts", "src/utils/helper.ts"],
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
          id: "directory:src/utils",
          kind: "directory",
          label: "utils",
          path: "src/utils"
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
          to: "directory:src/utils",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-021 detects a directory not represented in repository structure", () => {
  const violations = directoryNodesMustMatchRepositoryStructureRule.check({
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
          id: "directory:ghost",
          kind: "directory",
          label: "ghost",
          path: "ghost"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "directory:src",
          kind: "contains"
        },
        {
          from: "repository:root",
          to: "directory:ghost",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-021");
  assert.equal(violations[0].target, "directory:ghost");
});