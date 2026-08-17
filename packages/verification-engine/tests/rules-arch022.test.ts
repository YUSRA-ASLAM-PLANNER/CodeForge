import assert from "node:assert/strict";
import test from "node:test";
import { containsEdgesMustMatchPathsRule022 } from "../src/rules";

test("ARCH-022 passes when contains edges match parent-child paths", () => {
  const violations = containsEdgesMustMatchPathsRule022.check({
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

test("ARCH-022 detects a contains edge whose paths do not match", () => {
  const violations = containsEdgesMustMatchPathsRule022.check({
    files: ["src/index.ts"],
    graph: {
      nodes: [
        {
          id: "repository:root",
          kind: "repository",
          label: "CodeForge"
        },
        {
          id: "directory:other",
          kind: "directory",
          label: "other",
          path: "other"
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
          to: "directory:other",
          kind: "contains"
        },
        {
          from: "directory:other",
          to: "file:src/index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-022");
  assert.equal(
    violations[0].target,
    "directory:other->file:src/index.ts"
  );
});
