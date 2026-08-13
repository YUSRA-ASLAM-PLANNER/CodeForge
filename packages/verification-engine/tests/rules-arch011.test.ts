import test from "node:test";
import assert from "node:assert/strict";
import { selfReferentialEdgeRule } from "../src/rules";

test("ARCH-011 passes when edges connect different nodes", () => {
  const violations = selfReferentialEdgeRule.check({
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

test("ARCH-011 detects a self-referencing edge", () => {
  const violations = selfReferentialEdgeRule.check({
    files: [],
    graph: {
      nodes: [
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
          to: "file:index.ts",
          kind: "references"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-011");
});
