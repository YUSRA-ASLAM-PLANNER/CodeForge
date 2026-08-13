import test from "node:test";
import assert from "node:assert/strict";
import { validContextGraphEdgeKindsRule } from "../src/rules";

test("ARCH-007 passes when all edge kinds are supported", () => {
  const violations = validContextGraphEdgeKindsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:app.ts",
          kind: "file",
          label: "app.ts",
          path: "src/app.ts"
        }
      ],
      edges: [
        {
          from: "file:index.ts",
          to: "file:app.ts",
          kind: "imports"
        }
      ]
    }
  });

  assert.equal(violations.length, 0);
});

test("ARCH-007 detects an unsupported edge kind", () => {
  const violations = validContextGraphEdgeKindsRule.check({
    files: [],
    graph: {
      nodes: [
        {
          id: "file:index.ts",
          kind: "file",
          label: "index.ts",
          path: "src/index.ts"
        },
        {
          id: "file:app.ts",
          kind: "file",
          label: "app.ts",
          path: "src/app.ts"
        }
      ],
      edges: [
        {
          from: "file:index.ts",
          to: "file:app.ts",
          kind: "calls"
        }
      ]
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-007");
  assert.equal(violations[0].target, "calls");
});
