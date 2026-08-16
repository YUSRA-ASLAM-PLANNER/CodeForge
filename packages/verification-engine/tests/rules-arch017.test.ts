import assert from "node:assert/strict";
import test from "node:test";
import { fileNodesRequireParentRule } from "../src/rules";

test("ARCH-017 passes when every file has a parent contains edge", () => {
  const violations = fileNodesRequireParentRule.check({
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
          label: "src/index.ts",
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

test("ARCH-017 detects a file without a parent contains edge", () => {
  const violations = fileNodesRequireParentRule.check({
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
          label: "src/index.ts",
          path: "src/index.ts"
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
  assert.equal(violations[0].ruleId, "ARCH-017");
  assert.equal(violations[0].target, "file:src/index.ts");
});