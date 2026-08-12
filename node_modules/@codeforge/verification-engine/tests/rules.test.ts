import test from "node:test";
import assert from "node:assert/strict";
import { VerificationEngine } from "../src/engine";
import { contextGraphReferentialIntegrityRule } from "../src/rules";

test("ARCH-001 passes when all edges reference existing nodes", () => {
  const engine = new VerificationEngine();
  engine.addRule(contextGraphReferentialIntegrityRule);

  const result = engine.verify({
    files: ["src/a.ts", "src/b.ts"],
    graph: {
      nodes: [
        { id: "a", kind: "file", label: "a.ts", path: "src/a.ts" },
        { id: "b", kind: "file", label: "b.ts", path: "src/b.ts" }
      ],
      edges: [
        { from: "a", to: "b", kind: "imports" }
      ]
    }
  });

  assert.equal(result.passed, true);
  assert.equal(result.violations.length, 0);
});

test("ARCH-001 detects an edge pointing to a missing node", () => {
  const engine = new VerificationEngine();
  engine.addRule(contextGraphReferentialIntegrityRule);

  const result = engine.verify({
    files: ["src/a.ts"],
    graph: {
      nodes: [
        { id: "a", kind: "file", label: "a.ts", path: "src/a.ts" }
      ],
      edges: [
        { from: "a", to: "missing", kind: "imports" }
      ]
    }
  });

  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].ruleId, "ARCH-001");
  assert.equal(result.violations[0].target, "missing");
});
