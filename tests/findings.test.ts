import { test } from "node:test";
import assert from "node:assert/strict";
import { constructFinding } from "../packages/evaluation-engine/src/findings/finding";
import { DEFAULT_CANONICALIZATION_POLICY } from "../packages/evaluation-engine/src/canonicalization/policy";
import type { ObservedEvidence } from "../packages/evaluation-engine/src/domain/models";

function baseEvidence(): ObservedEvidence {
  return {
    evidence_id: "E1",
    artifact_id: "ART-01",
    evidence_class: "Interface",
    payload: { a: 1 },
  };
}

function baseInput() {
  const evidence = baseEvidence();
  return {
    targetArtifactId: "ART-01",
    requirementId: "REQ-01",
    criterionId: "CRIT-01",
    resultState: "Conforming" as const,
    rationale: "ok",
    predicate: {
      type: "ATTRIBUTE_EXISTS" as const,
      evidence_class: "Interface" as const,
      attribute: "a",
    },
    sufficiencyConditions: [
      { type: "MIN_COUNT" as const, evidence_class: "Interface" as const, min_count: 1 },
    ],
    evidenceItems: [{ evidence, integrityIdentifier: "i".repeat(64) }],
    canonicalizationPolicy: DEFAULT_CANONICALIZATION_POLICY,
  };
}

test("deterministic finding ID: same input always yields the same finding_id", () => {
  const a = constructFinding(baseInput());
  const b = constructFinding(baseInput());
  assert.equal(a.finding_id, b.finding_id);
});

test("different predicate yields a different finding_id", () => {
  const a = constructFinding(baseInput());
  const input2 = baseInput();
  input2.predicate = { ...input2.predicate, attribute: "b" };
  const b = constructFinding(input2);
  assert.notEqual(a.finding_id, b.finding_id);
});

test("different sufficiency contract yields a different finding_id", () => {
  const a = constructFinding(baseInput());
  const input2 = baseInput();
  input2.sufficiencyConditions = [
    { type: "MIN_COUNT", evidence_class: "Interface", min_count: 2 },
  ];
  const b = constructFinding(input2);
  assert.notEqual(a.finding_id, b.finding_id);
});

test("different evidence integrity yields a different finding_id", () => {
  const a = constructFinding(baseInput());
  const input2 = baseInput();
  input2.evidenceItems = [{ evidence: baseEvidence(), integrityIdentifier: "j".repeat(64) }];
  const b = constructFinding(input2);
  assert.notEqual(a.finding_id, b.finding_id);
});

test("result_state does not affect finding_id (identity vs conclusion separation)", () => {
  const a = constructFinding(baseInput());
  const input2 = baseInput();
  (input2 as { resultState: string }).resultState = "Non-Conforming";
  const b = constructFinding(input2);
  assert.equal(a.finding_id, b.finding_id);
});

test("finding identity is insensitive to evidence array input order (deterministic ordering)", () => {
  const e1: ObservedEvidence = { ...baseEvidence(), evidence_id: "E1" };
  const e2: ObservedEvidence = { ...baseEvidence(), evidence_id: "E2" };
  const inputA = baseInput();
  inputA.evidenceItems = [
    { evidence: e1, integrityIdentifier: "1".repeat(64) },
    { evidence: e2, integrityIdentifier: "2".repeat(64) },
  ];
  const inputB = baseInput();
  inputB.evidenceItems = [
    { evidence: e2, integrityIdentifier: "2".repeat(64) },
    { evidence: e1, integrityIdentifier: "1".repeat(64) },
  ];
  const a = constructFinding(inputA);
  const b = constructFinding(inputB);
  assert.equal(a.finding_id, b.finding_id);
});
