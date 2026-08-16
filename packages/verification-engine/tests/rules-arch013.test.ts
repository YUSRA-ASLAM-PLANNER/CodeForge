import test from "node:test";
import assert from "node:assert/strict";
import { orphanNodeRule } from "../src/rules";

test("ARCH-013 passes when every non-repository node is connected", () => {
  const violations = orphanNodeRule.check({
    files: ["index.ts"],
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

test("ARCH-013 detects an orphan node", () => {
  const violations = orphanNodeRule.check({
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
      edges: []
    }
  });

  assert.equal(violations.length, 1);
  assert.equal(violations[0].ruleId, "ARCH-013");
  assert.equal(violations[0].target, "file:index.ts");
});