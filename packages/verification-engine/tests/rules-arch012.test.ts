import test from "node:test";
import assert from "node:assert/strict";
import { duplicateEdgesRule } from "../src/rules";

test("ARCH-012 passes when edges are unique", () => {
  const violations = duplicateEdgesRule.check({
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
          from: "repository:root",
          to: "file:index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-012 detects duplicate edges", () => {
  const violations = duplicateEdgesRule.check({
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
          from: "repository:root",
          to: "file:index.ts",
          kind: "contains"
        },
        {
          from: "repository:root",
          to: "file:index.ts",
          kind: "contains"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-012");
});