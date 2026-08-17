import assert from "node:assert/strict";
import test from "node:test";
import { fileNodesMustMatchRepositoryFilesRule } from "../src/rules";

test("ARCH-020 passes when every file node matches a repository file", () => {
  const violations = fileNodesMustMatchRepositoryFilesRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "file:src/index.ts",
          kind: "file",
          label: "src/index.ts",
          path: "src/index.ts"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "file:src/index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-020 detects a file node missing from repository files", () => {
  const violations = fileNodesMustMatchRepositoryFilesRule.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "file:src/missing.ts",
          kind: "file",
          label: "src/missing.ts",
          path: "src/missing.ts"
        }
      ],
      edges: [
        {
          from: "repository:root",
          to: "file:src/missing.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-020");
  assert.equal(
    violations[0].target,
    "file:src/missing.ts"
  );
});