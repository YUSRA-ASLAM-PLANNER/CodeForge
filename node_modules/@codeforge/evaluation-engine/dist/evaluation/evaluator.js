"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateAll = evaluateAll;
const evidenceIntegrity_1 = require("../canonicalization/evidenceIntegrity");
const applicability_1 = require("./applicability");
const sufficiency_1 = require("./sufficiency");
const predicates_1 = require("./predicates");
const finding_1 = require("../findings/finding");
const errors_1 = require("../errors");
/**
 * Deterministically evaluate every (artifact, criterion) pair, applying:
 *   applicability -> evidence sufficiency -> structured predicate
 * in that order (Section 25 / 26). Ordering of returned findings is
 * deterministic: outer loop over `criteria` in input order, inner loop
 * over `artifacts` in input order.
 */
function evaluateAll(options) {
    const { context, canonicalizationPolicy } = options;
    const findings = [];
    for (const criterion of context.criteria) {
        if (criterion.structured_predicate === undefined) {
            // Defense-in-depth: validateDomain() should already have rejected
            // this upstream (Section 6). Fail loudly rather than silently.
            throw new errors_1.ValidationError(`Criterion '${criterion.criterion_id}' lacks a structured predicate.`);
        }
        const evidenceRequirements = context.evidence_requirements.filter((er) => er.criterion_id === criterion.criterion_id);
        const flattenedSufficiencyConditions = evidenceRequirements.flatMap((er) => er.sufficiency_conditions);
        for (const artifact of context.artifacts) {
            findings.push(evaluateOne(criterion, artifact, context, evidenceRequirements.map((er) => ({
                evidenceClass: er.evidence_class,
                conditions: er.sufficiency_conditions,
            })), flattenedSufficiencyConditions, canonicalizationPolicy));
        }
    }
    return findings;
}
function evidenceForArtifactAndClass(context, artifactId, evidenceClass) {
    return context.observed_evidence.filter((e) => e.artifact_id === artifactId && e.evidence_class === evidenceClass);
}
function evaluateOne(criterion, artifact, context, evidenceRequirementScopes, flattenedSufficiencyConditions, policy) {
    const predicate = criterion.structured_predicate;
    // 1. Applicability — evaluated first; Not Applicable requires no evidence
    //    and never executes the predicate.
    if (!(0, applicability_1.isCriterionApplicable)(criterion, artifact)) {
        return (0, finding_1.constructFinding)({
            targetArtifactId: artifact.artifact_id,
            requirementId: criterion.requirement_id,
            criterionId: criterion.criterion_id,
            resultState: "Not Applicable",
            rationale: `Artifact '${artifact.artifact_id}' is outside the applicability scope of ` +
                `criterion '${criterion.criterion_id}'.`,
            predicate,
            sufficiencyConditions: flattenedSufficiencyConditions,
            evidenceItems: [],
            canonicalizationPolicy: policy,
        });
    }
    // 2. Evidence sufficiency — evaluated before the predicate. Insufficiency
    //    from ANY declared evidence requirement short-circuits predicate
    //    evaluation and is never converted into Non-Conforming.
    const insufficiencyReasons = [];
    const evidenceUsed = new Map();
    if (evidenceRequirementScopes.length === 0) {
        // No declared evidence requirement: fall back to requiring at least one
        // evidence item of the predicate's own evidence class to exist, so a
        // criterion can never silently pass its predicate against zero evidence.
        const scoped = evidenceForArtifactAndClass(context, artifact.artifact_id, predicate.evidence_class);
        if (scoped.length === 0) {
            insufficiencyReasons.push(`No evidence of class '${predicate.evidence_class}' available for artifact ` +
                `'${artifact.artifact_id}'.`);
        }
        for (const e of scoped)
            evidenceUsed.set(e.evidence_id, e);
    }
    else {
        for (const scope of evidenceRequirementScopes) {
            const scoped = evidenceForArtifactAndClass(context, artifact.artifact_id, scope.evidenceClass);
            for (const e of scoped)
                evidenceUsed.set(e.evidence_id, e);
            const result = (0, sufficiency_1.evaluateSufficiency)(scope.conditions, scoped);
            if (!result.sufficient) {
                insufficiencyReasons.push(...result.reasons);
            }
        }
    }
    if (insufficiencyReasons.length > 0) {
        const evidenceItems = [...evidenceUsed.values()].map((evidence) => ({
            evidence,
            integrityIdentifier: (0, evidenceIntegrity_1.authenticateEvidence)(evidence, policy),
        }));
        return (0, finding_1.constructFinding)({
            targetArtifactId: artifact.artifact_id,
            requirementId: criterion.requirement_id,
            criterionId: criterion.criterion_id,
            resultState: "Insufficient Evidence",
            rationale: insufficiencyReasons.join(" "),
            predicate,
            sufficiencyConditions: flattenedSufficiencyConditions,
            evidenceItems,
            canonicalizationPolicy: policy,
        });
    }
    // 3. Structured predicate — evaluated only after applicability and
    //    sufficiency both pass. Predicate evidence is strictly scoped by
    //    (artifact_id, predicate.evidence_class).
    const predicateScopedEvidence = evidenceForArtifactAndClass(context, artifact.artifact_id, predicate.evidence_class);
    for (const e of predicateScopedEvidence)
        evidenceUsed.set(e.evidence_id, e);
    const predicateResult = (0, predicates_1.evaluateStructuredPredicate)(predicate, predicateScopedEvidence);
    const evidenceItems = [...evidenceUsed.values()].map((evidence) => ({
        evidence,
        integrityIdentifier: (0, evidenceIntegrity_1.authenticateEvidence)(evidence, policy),
    }));
    return (0, finding_1.constructFinding)({
        targetArtifactId: artifact.artifact_id,
        requirementId: criterion.requirement_id,
        criterionId: criterion.criterion_id,
        resultState: predicateResult.satisfied ? "Conforming" : "Non-Conforming",
        rationale: predicateResult.satisfied
            ? `All applicability, sufficiency, and predicate checks passed for criterion ` +
                `'${criterion.criterion_id}'.`
            : predicateResult.violations.join(" "),
        predicate,
        sufficiencyConditions: flattenedSufficiencyConditions,
        evidenceItems,
        canonicalizationPolicy: policy,
    });
}
