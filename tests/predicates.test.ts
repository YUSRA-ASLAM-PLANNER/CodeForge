import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateStructuredPredicate } from "../packages/evaluation-engine/src/evaluation/predicates";
import type { ObservedEvidence } from "../packages/evaluation-engine/src/domain/models";

function evidence(id: string, payload: Record<string, unknown>): ObservedEvidence {
  return {
    evidence_id: id,
    artifact_id: "ART-01",
    evidence_class: "Interface",
    payload: payload as never,
  };
}

test("ATTRIBUTE_EXISTS: success when attribute present on all items", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" },
    [evidence("E1", { path: "/a" })]
  );
  assert.equal(result.satisfied, true);
});

test("ATTRIBUTE_EXISTS: fails when attribute missing", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" },
    [evidence("E1", { other: 1 })]
  );
  assert.equal(result.satisfied, false);
});

test("ATTRIBUTE_EQUALS: success when value matches", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" },
    [evidence("E1", { mode: "prod" })]
  );
  assert.equal(result.satisfied, true);
});

test("ATTRIBUTE_EQUALS: fails when attribute missing", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" },
    [evidence("E1", {})]
  );
  assert.equal(result.satisfied, false);
});

test("ATTRIBUTE_EQUALS: fails when value mismatches", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" },
    [evidence("E1", { mode: "debug" })]
  );
  assert.equal(result.satisfied, false);
});

test("ATTRIBUTE_NOT_EQUALS: success when value differs", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" },
    [evidence("E1", { mode: "prod" })]
  );
  assert.equal(result.satisfied, true);
});

test("ATTRIBUTE_NOT_EQUALS: fails when value equals forbidden value", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" },
    [evidence("E1", { mode: "debug" })]
  );
  assert.equal(result.satisfied, false);
});

test("ATTRIBUTE_NOT_EQUALS: missing attribute is a violation, NOT a pass (safety rule)", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" },
    [evidence("E1", {})]
  );
  assert.equal(result.satisfied, false);
  assert.match(result.violations[0]!, /missing/);
});

test("no evidence: predicate cannot be satisfied over an empty evidence set", () => {
  const result = evaluateStructuredPredicate(
    { type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" },
    []
  );
  assert.equal(result.satisfied, false);
});
