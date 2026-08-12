import test from "node:test";
import assert from "node:assert/strict";
import { VerificationEngine } from "../src/engine";

test("passes when all verification rules pass", () => {
  const engine = new VerificationEngine();

  engine.addRule({
    id: "ARCH-001",
    description: "Example passing rule",
    severity: "error",
    check: () => []
  });

  const result = engine.verify({
    files: ["src/index.ts"],
    graph: {
      nodes: [],
      edges: []
    }
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.violations, []);
});

test("reports violations from failed rules", () => {
  const engine = new VerificationEngine();

  engine.addRule({
    id: "ARCH-001",
    description: "Example failing rule",
    severity: "error",
    check: () => [
      {
        ruleId: "ARCH-001",
        severity: "error",
        message: "Forbidden dependency detected",
        target: "src/api.ts"
      }
    ]
  });

  const result = engine.verify({
    files: ["src/api.ts"],
    graph: {
      nodes: [],
      edges: []
    }
  });

  assert.equal(result.passed, false);
  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].target, "src/api.ts");
});

test("rejects duplicate rule IDs", () => {
  const engine = new VerificationEngine();

  const rule = {
    id: "ARCH-001",
    description: "Duplicate test rule",
    severity: "warning" as const,
    check: () => []
  };

  engine.addRule(rule);

  assert.throws(
    () => engine.addRule(rule),
    /Verification rule already exists/
  );
});
