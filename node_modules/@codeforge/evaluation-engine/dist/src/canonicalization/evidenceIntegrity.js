"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeEvidenceIntegrityIdentifier = computeEvidenceIntegrityIdentifier;
exports.authenticateEvidence = authenticateEvidence;
const errors_1 = require("../errors");
const hash_1 = require("../hash");
const canonicalizer_1 = require("./canonicalizer");
/**
 * Compute the expected integrity_identifier for a piece of observed
 * evidence: SHA-256 of the canonical-JSON serialization of its payload.
 */
function computeEvidenceIntegrityIdentifier(evidence, policy) {
    const canonicalPayload = (0, canonicalizer_1.canonicalize)(evidence.payload, policy);
    return (0, hash_1.sha256Hex)(canonicalPayload);
}
/**
 * Authenticate a single evidence item and return its authoritative
 * integrity_identifier.
 *
 * Semantic contract (explicit, per Chapter 14 Section 17):
 *   - If `integrity_identifier` is ABSENT: this is a "compute and
 *     authenticate" input — we compute the hash and adopt it as the
 *     item's identity going forward. This is consistent with the JSON
 *     Schema, which marks `integrity_identifier` optional on input.
 *   - If `integrity_identifier` is PRESENT: it must exactly equal the
 *     recomputed hash. Any mismatch is rejected — we never silently
 *     authenticate data whose claimed identity does not match its
 *     content.
 */
function authenticateEvidence(evidence, policy) {
    const expected = computeEvidenceIntegrityIdentifier(evidence, policy);
    if (evidence.integrity_identifier === undefined) {
        return expected;
    }
    if (evidence.integrity_identifier !== expected) {
        throw new errors_1.IntegrityMismatchError(`Evidence '${evidence.evidence_id}' integrity_identifier mismatch: ` +
            `declared='${evidence.integrity_identifier}' expected='${expected}'`);
    }
    return expected;
}
