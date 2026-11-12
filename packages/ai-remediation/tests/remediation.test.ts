import { test } from "node:test";
import assert from "node:assert";
import { AIRemediationEngine } from "../src/engine.js";

test("AIRemediationEngine generates static fallback patch when API key is missing", async () => {
  const engine = new AIRemediationEngine();
  const mockFinding = {
    finding_id: "find-001",
    rule_id: "ARCH-024",
    target: "src/ui/Component.ts",
    message: "UI component directly imports database layer"
  };

  const patch = await engine.generateFix(mockFinding, "import { db } from '../db';");
  assert.strictEqual(patch.findingId, "find-001");
  assert.strictEqual(patch.ruleId, "ARCH-024");
  assert.strictEqual(patch.confidenceScore, 0.85);
});
