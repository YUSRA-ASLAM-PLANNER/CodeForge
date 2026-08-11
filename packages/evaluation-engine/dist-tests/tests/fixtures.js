"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clone = clone;
exports.mutable = mutable;
exports.baseContext = baseContext;
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
/** Cast a cloned fixture to a deep-mutable view for in-place test mutation. */
function mutable(value) {
    return value;
}
/**
 * A minimal, valid Chapter14EvaluationContext used as a starting point for
 * mutation-based negative tests. One requirement, one criterion (with a
 * structured predicate), one evidence requirement, one artifact, one
 * evidence item that satisfies everything, one baseline, no traceability
 * links (kept empty by default; individual tests add links as needed).
 */
function baseContext() {
    return {
        requirements: [
            {
                requirement_id: "REQ-01",
                title: "Base requirement",
                constraint_level: "Foundational",
            },
        ],
        criteria: [
            {
                criterion_id: "CRIT-01",
                requirement_id: "REQ-01",
                definition: "Interface evidence must declare health_check_path.",
                structured_predicate: {
                    type: "ATTRIBUTE_EXISTS",
                    evidence_class: "Interface",
                    attribute: "health_check_path",
                },
            },
        ],
        evidence_requirements: [
            {
                evidence_requirement_id: "ER-01",
                criterion_id: "CRIT-01",
                evidence_class: "Interface",
                sufficiency_conditions: [
                    { type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 },
                ],
            },
        ],
        observed_evidence: [
            {
                evidence_id: "EV-01",
                artifact_id: "ART-01",
                evidence_class: "Interface",
                payload: { health_check_path: "/healthz" },
            },
        ],
        artifacts: [{ artifact_id: "ART-01", artifact_type: "service" }],
        baselines: [{ baseline_id: "BASE-01" }],
        traceability_links: [],
    };
}
