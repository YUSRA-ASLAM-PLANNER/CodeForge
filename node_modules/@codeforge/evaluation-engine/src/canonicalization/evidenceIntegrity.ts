import type { ObservedEvidence } from "../domain/models";
import { IntegrityMismatchError } from "../errors";
import { sha256Hex } from "../hash";
import { CanonicalizationPolicy } from "./policy";
import { canonicalize } from "./canonicalizer";

/**
 * Compute the expected integrity_identifier for a piece of observed
 * evidence: SHA-256 of the canonical-JSON serialization of its payload.
 */
export function computeEvidenceIntegrityIdentifier(
  evidence: ObservedEvidence,
  policy: CanonicalizationPolicy
): string {
  const canonicalPayload = canonicalize(evidence.payload, policy);
  return sha256Hex(canonicalPayload);
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
export function authenticateEvidence(
  evidence: ObservedEvidence,
  policy: CanonicalizationPolicy
): string {
  const expected = computeEvidenceIntegrityIdentifier(evidence, policy);

  if (evidence.integrity_identifier === undefined) {
    return expected;
  }

  if (evidence.integrity_identifier !== expected) {
    throw new IntegrityMismatchError(
      `Evidence '${evidence.evidence_id}' integrity_identifier mismatch: ` +
        `declared='${evidence.integrity_identifier}' expected='${expected}'`
    );
  }

  return expected;
}
