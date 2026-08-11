import type {
  ConformanceFinding,
  EvidenceIdentityRef,
  FindingResultState,
  JsonValue,
  ObservedEvidence,
  StructuredPredicate,
  StructuredSufficiencyCondition,
} from "../domain/models";
import { EVALUATOR_VERSION, SEMANTICS_VERSION } from "../domain/models";
import { canonicalize } from "../canonicalization/canonicalizer";
import { CanonicalizationPolicy, serializePolicyForHashing } from "../canonicalization/policy";
import { sha256Hex } from "../hash";

/**
 * Evidence identity: (evidence_id, integrity_identifier) pairs, ordered
 * deterministically by evidence_id — never relying on incoming array order.
 */
export function buildEvidenceIdentity(
  evidenceItems: readonly { readonly evidence: ObservedEvidence; readonly integrityIdentifier: string }[]
): readonly EvidenceIdentityRef[] {
  return [...evidenceItems]
    .sort((a, b) =>
      a.evidence.evidence_id < b.evidence.evidence_id
        ? -1
        : a.evidence.evidence_id > b.evidence.evidence_id
          ? 1
          : 0
    )
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
function asJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

function hashPredicate(predicate: StructuredPredicate | undefined, policy: CanonicalizationPolicy): string {
  if (predicate === undefined) {
    // Never actually reached in the production pipeline (Section 6 rejects
    // predicate-less criteria before evaluation), but hashed explicitly and
    // distinctly so identity never silently collides with a real predicate.
    return sha256Hex("ABSENT_PREDICATE");
  }
  return sha256Hex(canonicalize(asJsonValue(predicate), policy));
}

function hashSufficiencyConditions(
  conditions: readonly StructuredSufficiencyCondition[],
  policy: CanonicalizationPolicy
): string {
  return sha256Hex(canonicalize(asJsonValue(conditions), policy));
}

function hashEvidenceRefs(refs: readonly EvidenceIdentityRef[]): string {
  // refs are already deterministically ordered by buildEvidenceIdentity.
  const serialized = refs.map((r) => `${r.evidence_id}:${r.integrity_identifier}`).join("|");
  return sha256Hex(serialized);
}

export interface FindingIdentityInput {
  readonly targetArtifactId: string;
  readonly requirementId: string;
  readonly criterionId: string;
  readonly resultState: FindingResultState;
  readonly rationale: string;
  readonly predicate: StructuredPredicate | undefined;
  readonly sufficiencyConditions: readonly StructuredSufficiencyCondition[];
  readonly evidenceItems: readonly {
    readonly evidence: ObservedEvidence;
    readonly integrityIdentifier: string;
  }[];
  readonly canonicalizationPolicy: CanonicalizationPolicy;
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
export function constructFinding(input: FindingIdentityInput): ConformanceFinding {
  const predicateHash = hashPredicate(input.predicate, input.canonicalizationPolicy);
  const sufficiencyHash = hashSufficiencyConditions(
    input.sufficiencyConditions,
    input.canonicalizationPolicy
  );
  const evidenceRefs = buildEvidenceIdentity(input.evidenceItems);
  const evidenceHash = hashEvidenceRefs(evidenceRefs);
  const policyHash = sha256Hex(serializePolicyForHashing(input.canonicalizationPolicy));

  const identityPayload = [
    input.targetArtifactId,
    input.requirementId,
    input.criterionId,
    predicateHash,
    sufficiencyHash,
    evidenceHash,
    EVALUATOR_VERSION,
    SEMANTICS_VERSION,
    policyHash,
  ].join("::");

  const findingId = sha256Hex(identityPayload);

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
    evaluator_version: EVALUATOR_VERSION,
    semantics_version: SEMANTICS_VERSION,
    canonicalization_policy_hash: policyHash,
  };
}
