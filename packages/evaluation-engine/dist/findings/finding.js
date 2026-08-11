"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEvidenceIdentity = buildEvidenceIdentity;
exports.constructFinding = constructFinding;
const models_1 = require("../domain/models");
const canonicalizer_1 = require("../canonicalization/canonicalizer");
const policy_1 = require("../canonicalization/policy");
const hash_1 = require("../hash");
/**
 * Evidence identity: (evidence_id, integrity_identifier) pairs, ordered
 * deterministically by evidence_id — never relying on incoming array order.
 */
function buildEvidenceIdentity(evidenceItems) {
    return [...evidenceItems]
        .sort((a, b) => a.evidence.evidence_id < b.evidence.evidence_id
        ? -1
        : a.evidence.evidence_id > b.evidence.evidence_id
            ? 1
            : 0)
        .map((item) => ({
        evidence_id: item.evidence.evidence_id,
        integrity_identifier: item.integrityIdentifier,
    }));
}
/**
 * Structured predicates and sufficiency conditions are plain JSON-shaped
 * objects (string/number/boolean/null-valued fields only), so this boundary
 * cast to JsonValue is safe: it is guarded by the domain/schema layers that
 * already constrain these types to JSON-serializable literals.
 */
function asJsonValue(value) {
    return value;
}
function hashPredicate(predicate, policy) {
    if (predicate === undefined) {
        // Never actually reached in the production pipeline (Section 6 rejects
        // predicate-less criteria before evaluation), but hashed explicitly and
        // distinctly so identity never silently collides with a real predicate.
        return (0, hash_1.sha256Hex)("ABSENT_PREDICATE");
    }
    return (0, hash_1.sha256Hex)((0, canonicalizer_1.canonicalize)(asJsonValue(predicate), policy));
}
function hashSufficiencyConditions(conditions, policy) {
    return (0, hash_1.sha256Hex)((0, canonicalizer_1.canonicalize)(asJsonValue(conditions), policy));
}
function hashEvidenceRefs(refs) {
    // refs are already deterministically ordered by buildEvidenceIdentity.
    const serialized = refs.map((r) => `${r.evidence_id}:${r.integrity_identifier}`).join("|");
    return (0, hash_1.sha256Hex)(serialized);
}
/**
 * Construct an immutable ConformanceFinding whose `finding_id` binds the
 * complete effective evaluation contract (Section 18):
 *   target_artifact_id, requirement_id, criterion_id, predicate_hash,
 *   effective sufficiency conditions, evidence identity, evaluator_version,
 *   semantics_version, and the canonicalization policy (since it materially
 *   affects evaluation identity via hashing/ordering).
 *
 * `result_state` and `rationale` are deliberately NOT included in the
 * identity hash: identity represents "what was evaluated", while the
 * result is "what was concluded" — this way the same logical evaluation
 * always yields the same finding_id even if a bug were to momentarily flip
 * the concluded state, which keeps idempotent persistence (Section 23)
 * meaningful as a content-integrity check rather than a coincidence.
 */
function constructFinding(input) {
    const predicateHash = hashPredicate(input.predicate, input.canonicalizationPolicy);
    const sufficiencyHash = hashSufficiencyConditions(input.sufficiencyConditions, input.canonicalizationPolicy);
    const evidenceRefs = buildEvidenceIdentity(input.evidenceItems);
    const evidenceHash = hashEvidenceRefs(evidenceRefs);
    const policyHash = (0, hash_1.sha256Hex)((0, policy_1.serializePolicyForHashing)(input.canonicalizationPolicy));
    const identityPayload = [
        input.targetArtifactId,
        input.requirementId,
        input.criterionId,
        predicateHash,
        sufficiencyHash,
        evidenceHash,
        models_1.EVALUATOR_VERSION,
        models_1.SEMANTICS_VERSION,
        policyHash,
    ].join("::");
    const findingId = (0, hash_1.sha256Hex)(identityPayload);
    return {
        finding_id: findingId,
        target_artifact_id: input.targetArtifactId,
        requirement_id: input.requirementId,
        criterion_id: input.criterionId,
        result_state: input.resultState,
        rationale: input.rationale,
        predicate_hash: predicateHash,
        sufficiency_hash: sufficiencyHash,
        evidence_refs: evidenceRefs,
        evaluator_version: models_1.EVALUATOR_VERSION,
        semantics_version: models_1.SEMANTICS_VERSION,
        canonicalization_policy_hash: policyHash,
    };
}
