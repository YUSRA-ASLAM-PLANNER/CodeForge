import type { Chapter14EvaluationContext } from "../src/domain/models";

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Deep-mutable view of a readonly domain type, for test-only mutation of
 * cloned fixtures. The domain model is intentionally `readonly` everywhere
 * (Section 30 — immutability); tests still need to construct malformed
 * variants, so this helper narrows that immutability locally and only
 * inside test files.
 */
export type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;

/** Cast a cloned fixture to a deep-mutable view for in-place test mutation. */
export function mutable<T>(value: T): Mutable<T> {
  return value as Mutable<T>;
}


/**
 * A minimal, valid Chapter14EvaluationContext used as a starting point for
 * mutation-based negative tests. One requirement, one criterion (with a
 * structured predicate), one evidence requirement, one artifact, one
 * evidence item that satisfies everything, one baseline, no traceability
 * links (kept empty by default; individual tests add links as needed).
 */
export function baseContext(): Chapter14EvaluationContext {
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
