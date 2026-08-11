"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateStructuredPredicate = evaluateStructuredPredicate;
const canonicalizer_1 = require("../canonicalization/canonicalizer");
/**
 * Read a top-level attribute out of an evidence payload. Attributes are
 * simple property names on the payload object (not JSONPath expressions).
 * Returns a sentinel indicating presence + value, since a JSON value of
 * `null` is a legitimate "present" value distinct from "absent".
 */
function readAttribute(payload, attribute) {
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return { present: false, value: undefined };
    }
    const obj = payload;
    if (Object.prototype.hasOwnProperty.call(obj, attribute)) {
        return { present: true, value: obj[attribute] };
    }
    return { present: false, value: undefined };
}
function deepEquals(a, b) {
    return (0, canonicalizer_1.canonicalJsonStringify)(a) === (0, canonicalizer_1.canonicalJsonStringify)(b);
}
/**
 * Evaluate a structured predicate against the evidence items that are
 * already scoped to the target artifact AND the predicate's declared
 * evidence_class (Section 7 — predicate evaluation must never accidentally
 * evaluate evidence belonging to another artifact or evidence class).
 *
 * Semantics (deliberate, explicit design decision): the predicate must
 * hold across EVERY applicable (artifact + evidence_class scoped) evidence
 * item — this mirrors the explicit "every applicable evidence item" rule
 * stated for ATTRIBUTE_EXISTS in Section 5, applied uniformly to all three
 * predicate types for consistency and to avoid a predicate silently
 * passing because only one of several conflicting evidence items matched.
 *
 * If no scoped evidence items are supplied, the predicate cannot be
 * evaluated. This should never happen in the production pipeline because
 * evidence sufficiency is checked before predicate evaluation (Section 26);
 * this function still fails closed (non-satisfied) rather than vacuously
 * succeeding, as a defense-in-depth measure.
 */
function evaluateStructuredPredicate(predicate, scopedEvidence) {
    if (scopedEvidence.length === 0) {
        return {
            satisfied: false,
            violations: [
                `No evidence of class '${predicate.evidence_class}' available to evaluate predicate.`,
            ],
        };
    }
    const violations = [];
    for (const evidence of scopedEvidence) {
        const { present, value } = readAttribute(evidence.payload, predicate.attribute);
        switch (predicate.type) {
            case "ATTRIBUTE_EXISTS": {
                if (!present) {
                    violations.push(`Attribute '${predicate.attribute}' missing on evidence '${evidence.evidence_id}'.`);
                }
                break;
            }
            case "ATTRIBUTE_EQUALS": {
                if (!present) {
                    violations.push(`Attribute '${predicate.attribute}' missing on evidence '${evidence.evidence_id}' ` +
                        `(expected equality check cannot proceed).`);
                }
                else if (!deepEquals(value, predicate.expected)) {
                    violations.push(`Attribute '${predicate.attribute}' on evidence '${evidence.evidence_id}' does not ` +
                        `equal expected value.`);
                }
                break;
            }
            case "ATTRIBUTE_NOT_EQUALS": {
                // Intentional safety rule (Section 5): a missing attribute NEVER
                // satisfies ATTRIBUTE_NOT_EQUALS. It is treated as a violation,
                // exactly like the other two predicate types.
                if (!present) {
                    violations.push(`Attribute '${predicate.attribute}' missing on evidence '${evidence.evidence_id}' ` +
                        `(cannot confirm it differs from the forbidden value).`);
                }
                else if (deepEquals(value, predicate.expected)) {
                    violations.push(`Attribute '${predicate.attribute}' on evidence '${evidence.evidence_id}' equals the ` +
                        `forbidden value.`);
                }
                break;
            }
        }
    }
    return { satisfied: violations.length === 0, violations };
}
