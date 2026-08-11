"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const finding_1 = require("../src/findings/finding");
const policy_1 = require("../src/canonicalization/policy");
function baseEvidence() {
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
        resultState: "Conforming",
        rationale: "ok",
        predicate: {
            type: "ATTRIBUTE_EXISTS",
            evidence_class: "Interface",
            attribute: "a",
        },
        sufficiencyConditions: [
            { type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 },
        ],
        evidenceItems: [{ evidence, integrityIdentifier: "i".repeat(64) }],
        canonicalizationPolicy: policy_1.DEFAULT_CANONICALIZATION_POLICY,
    };
}
(0, node_test_1.test)("deterministic finding ID: same input always yields the same finding_id", () => {
    const a = (0, finding_1.constructFinding)(baseInput());
    const b = (0, finding_1.constructFinding)(baseInput());
    strict_1.default.equal(a.finding_id, b.finding_id);
});
(0, node_test_1.test)("different predicate yields a different finding_id", () => {
    const a = (0, finding_1.constructFinding)(baseInput());
    const input2 = baseInput();
    input2.predicate = { ...input2.predicate, attribute: "b" };
    const b = (0, finding_1.constructFinding)(input2);
    strict_1.default.notEqual(a.finding_id, b.finding_id);
});
(0, node_test_1.test)("different sufficiency contract yields a different finding_id", () => {
    const a = (0, finding_1.constructFinding)(baseInput());
    const input2 = baseInput();
    input2.sufficiencyConditions = [
        { type: "MIN_COUNT", evidence_class: "Interface", min_count: 2 },
    ];
    const b = (0, finding_1.constructFinding)(input2);
    strict_1.default.notEqual(a.finding_id, b.finding_id);
});
(0, node_test_1.test)("different evidence integrity yields a different finding_id", () => {
    const a = (0, finding_1.constructFinding)(baseInput());
    const input2 = baseInput();
    input2.evidenceItems = [{ evidence: baseEvidence(), integrityIdentifier: "j".repeat(64) }];
    const b = (0, finding_1.constructFinding)(input2);
    strict_1.default.notEqual(a.finding_id, b.finding_id);
});
(0, node_test_1.test)("result_state does not affect finding_id (identity vs conclusion separation)", () => {
    const a = (0, finding_1.constructFinding)(baseInput());
    const input2 = baseInput();
    input2.resultState = "Non-Conforming";
    const b = (0, finding_1.constructFinding)(input2);
    strict_1.default.equal(a.finding_id, b.finding_id);
});
(0, node_test_1.test)("finding identity is insensitive to evidence array input order (deterministic ordering)", () => {
    const e1 = { ...baseEvidence(), evidence_id: "E1" };
    const e2 = { ...baseEvidence(), evidence_id: "E2" };
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
    const a = (0, finding_1.constructFinding)(inputA);
    const b = (0, finding_1.constructFinding)(inputB);
    strict_1.default.equal(a.finding_id, b.finding_id);
});
