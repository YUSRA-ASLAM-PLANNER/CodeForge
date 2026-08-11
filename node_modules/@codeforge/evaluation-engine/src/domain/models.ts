/**
 * CodeForge — Chapter 14 Evaluation Engine
 * Domain Model (single source of truth).
 *
 * Every other layer (schema, validation, canonicalization, evaluation,
 * findings, WAL, CLI) must agree with this file. Do not introduce a
 * second incompatible representation of these types elsewhere.
 *
 * semantics_version: "2.0.0"
 * evaluator_version:  "3.1.0"
 */

export const SEMANTICS_VERSION = "2.0.0" as const;
export const EVALUATOR_VERSION = "3.1.0" as const;

export const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000" as const;

// ---------------------------------------------------------------------------
// Enums / literal unions
// ---------------------------------------------------------------------------

export type ConstraintLevel = "Foundational" | "Standard";

export type EvidenceClass =
  | "Structural"
  | "Dependency"
  | "Interface"
  | "Configuration"
  | "Baseline"
  | "Traceability"
  | "ExecutionTrace";

export const EVIDENCE_CLASSES: readonly EvidenceClass[] = [
  "Structural",
  "Dependency",
  "Interface",
  "Configuration",
  "Baseline",
  "Traceability",
  "ExecutionTrace",
];

export type FindingResultState =
  | "Conforming"
  | "Non-Conforming"
  | "Insufficient Evidence"
  | "Not Applicable";

export type PredicateType =
  | "ATTRIBUTE_EXISTS"
  | "ATTRIBUTE_EQUALS"
  | "ATTRIBUTE_NOT_EQUALS";

export type SufficiencyPredicateType =
  | "CONTAIN_ATTRIBUTE"
  | "CONTAIN_KEY"
  | "MIN_COUNT";

export type ArraySemantics = "ORDERED" | "UNORDERED";

/** JSON scalar/compound value used inside attribute payloads and predicates. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// ---------------------------------------------------------------------------
// Structured predicates
// ---------------------------------------------------------------------------

interface StructuredPredicateBase {
  readonly evidence_class: EvidenceClass;
  readonly attribute: string;
}

export interface AttributeExistsPredicate extends StructuredPredicateBase {
  readonly type: "ATTRIBUTE_EXISTS";
}

export interface AttributeEqualsPredicate extends StructuredPredicateBase {
  readonly type: "ATTRIBUTE_EQUALS";
  readonly expected: JsonValue;
}

export interface AttributeNotEqualsPredicate extends StructuredPredicateBase {
  readonly type: "ATTRIBUTE_NOT_EQUALS";
  readonly expected: JsonValue;
}

export type StructuredPredicate =
  | AttributeExistsPredicate
  | AttributeEqualsPredicate
  | AttributeNotEqualsPredicate;

// ---------------------------------------------------------------------------
// Structured sufficiency conditions
// ---------------------------------------------------------------------------

interface SufficiencyConditionBase {
  readonly evidence_class: EvidenceClass;
}

export interface ContainAttributeCondition extends SufficiencyConditionBase {
  readonly type: "CONTAIN_ATTRIBUTE";
  readonly attribute: string;
}

export interface ContainKeyCondition extends SufficiencyConditionBase {
  readonly type: "CONTAIN_KEY";
  readonly key: string;
}

export interface MinCountCondition extends SufficiencyConditionBase {
  readonly type: "MIN_COUNT";
  readonly min_count: number;
}

export type StructuredSufficiencyCondition =
  | ContainAttributeCondition
  | ContainKeyCondition
  | MinCountCondition;

// ---------------------------------------------------------------------------
// Core entities
// ---------------------------------------------------------------------------

export interface Requirement {
  readonly requirement_id: string;
  readonly title: string;
  readonly description?: string;
  readonly constraint_level: ConstraintLevel;
}

/** Scopes a criterion to the artifacts it applies to. Empty/absent = universal. */
export interface ApplicabilityScope {
  readonly artifact_ids?: readonly string[];
  readonly artifact_tags?: readonly string[];
}

export interface Criterion {
  readonly criterion_id: string;
  readonly requirement_id: string;
  readonly definition: string;
  readonly structured_predicate?: StructuredPredicate;
  readonly applicability?: ApplicabilityScope;
}

export interface EvidenceRequirement {
  readonly evidence_requirement_id: string;
  readonly criterion_id: string;
  readonly evidence_class: EvidenceClass;
  readonly sufficiency_conditions: readonly StructuredSufficiencyCondition[];
}

export interface ArtifactReference {
  readonly artifact_id: string;
  readonly artifact_type: string;
  readonly tags?: readonly string[];
  readonly baseline_id?: string;
}

export interface ObservedEvidence {
  readonly evidence_id: string;
  readonly artifact_id: string;
  readonly evidence_class: EvidenceClass;
  /** Arbitrary evidence payload; canonicalized/hashed deterministically. */
  readonly payload: JsonValue;
  /** If present, must equal SHA-256(canonical(payload)); mismatch is rejected. */
  readonly integrity_identifier?: string;
}

export interface Baseline {
  readonly baseline_id: string;
  readonly description?: string;
}

export type TraceabilityEntityKind =
  | "Requirement"
  | "Criterion"
  | "EvidenceRequirement"
  | "ObservedEvidence"
  | "Artifact"
  | "Baseline";

export interface TraceabilityLink {
  readonly link_id: string;
  readonly source_id: string;
  readonly source_kind: TraceabilityEntityKind;
  readonly target_id: string;
  readonly target_kind: TraceabilityEntityKind;
  readonly relation: string;
}

export interface Chapter14EvaluationContext {
  readonly requirements: readonly Requirement[];
  readonly criteria: readonly Criterion[];
  readonly evidence_requirements: readonly EvidenceRequirement[];
  readonly observed_evidence: readonly ObservedEvidence[];
  readonly artifacts: readonly ArtifactReference[];
  readonly baselines: readonly Baseline[];
  readonly traceability_links: readonly TraceabilityLink[];
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export interface EvidenceIdentityRef {
  readonly evidence_id: string;
  readonly integrity_identifier: string;
}

export interface ConformanceFinding {
  readonly finding_id: string;
  readonly target_artifact_id: string;
  readonly requirement_id: string;
  readonly criterion_id: string;
  readonly result_state: FindingResultState;
  readonly rationale: string;
  readonly predicate_hash: string;
  readonly sufficiency_hash: string;
  readonly evidence_refs: readonly EvidenceIdentityRef[];
  readonly evaluator_version: string;
  readonly semantics_version: string;
  readonly canonicalization_policy_hash: string;
}

// ---------------------------------------------------------------------------
// WAL
// ---------------------------------------------------------------------------

export interface WalLogRecord {
  readonly sequence_number: number;
  readonly previous_hash: string;
  readonly record_hash: string;
  readonly finding: ConformanceFinding;
}
