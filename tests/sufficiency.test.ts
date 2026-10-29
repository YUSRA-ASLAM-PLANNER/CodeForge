import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSufficiency } from "../packages/evaluation-engine/src/evaluation/sufficiency";
import type { ObservedEvidence } from "../packages/evaluation-engine/src/domain/models";

function evidence(id: string, payload: Record<string, unknown>): ObservedEvidence {
  return {
    evidence_id: id,
    artifact_id: "ART-01",
    evidence_class: "Interface",
    payload: payload as never,
  };
}

test("sufficient: all conditions satisfied", () => {
  const result = evaluateSufficiency(
    [
      { type: "CONTAIN_ATTRIBUTE", evidence_class: "Interface", attribute: "path" },
      { type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 },
    ],
    [evidence("E1", { path: "/a" })]
  );
  assert.equal(result.sufficient, true);
});

test("missing evidence: empty scoped evidence is insufficient", () => {
  const result = evaluateSufficiency(
    [{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 }],
    []
  );
  assert.equal(result.sufficient, false);
});

test("missing attribute: CONTAIN_ATTRIBUTE fails when no item has it", () => {
  const result = evaluateSufficiency(
    [{ type: "CONTAIN_ATTRIBUTE", evidence_class: "Interface", attribute: "path" }],
    [evidence("E1", { other: 1 })]
  );
  assert.equal(result.sufficient, false);
});

test("missing key: CONTAIN_KEY fails when no item has it", () => {
  const result = evaluateSufficiency(
    [{ type: "CONTAIN_KEY", evidence_class: "Interface", key: "path" }],
    [evidence("E1", { other: 1 })]
  );
  assert.equal(result.sufficient, false);
});

test("minimum count satisfied", () => {
  const result = evaluateSufficiency(
    [{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 2 }],
    [evidence("E1", {}), evidence("E2", {})]
  );
  assert.equal(result.sufficient, true);
});

test("minimum count not satisfied", () => {
  const result = evaluateSufficiency(
    [{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 3 }],
    [evidence("E1", {}), evidence("E2", {})]
  );
  assert.equal(result.sufficient, false);
});
