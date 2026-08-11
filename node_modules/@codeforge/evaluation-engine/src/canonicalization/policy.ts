import type { ArraySemantics } from "../domain/models";

/**
 * Declarative canonicalization policy. Array ordering semantics are
 * determined by JSON path, NOT by ad-hoc checks like
 * `evidence_class === "ExecutionTrace"`. This keeps semantics explicit,
 * auditable, and schema/path driven.
 */
export interface CanonicalizationPolicy {
  readonly defaultSemantics: ArraySemantics;
  readonly pathSemanticsMap: Readonly<Record<string, ArraySemantics>>;
}

/**
 * Default production policy.
 *
 * - `$.events` (top-level execution-trace event list) is ORDERED: execution
 *   order is semantic information and must never be reordered.
 * - `$.events[*].dependencies` is UNORDERED: dependency sets within a single
 *   event carry no meaningful order.
 * - Everything else defaults to UNORDERED, matching the general evidence
 *   model where arrays represent sets/collections unless stated otherwise.
 */
export const DEFAULT_CANONICALIZATION_POLICY: CanonicalizationPolicy = {
  defaultSemantics: "UNORDERED",
  pathSemanticsMap: {
    "$.events": "ORDERED",
    "$.events[*].dependencies": "UNORDERED",
  },
};

/**
 * Normalize a concrete JSON path (with numeric array indexes) into its
 * wildcard form for policy lookup.
 *
 * CRITICAL: only replace bracketed numeric indexes, e.g. `[0]`, `[12]`,
 * with `[*]`. A naive character-class regex such as `/[\d+]/g` is WRONG
 * because it matches individual digit/plus characters anywhere in the
 * string (including inside property names), not array index groups.
 *
 *   "$.events[0]"                       -> "$.events[*]"
 *   "$.events[12].dependencies[3]"      -> "$.events[*].dependencies[*]"
 */
export function toWildcardPath(propertyPath: string): string {
  return propertyPath.replace(/\[\d+\]/g, "[*]");
}

/**
 * Resolve the effective array semantics for a concrete property path.
 *
 * Precedence (highest to lowest):
 *   1. exact match against `pathSemanticsMap`
 *   2. wildcard match (numeric indexes normalized to `[*]`)
 *   3. `policy.defaultSemantics`
 */
export function resolvePathSemantics(
  propertyPath: string,
  policy: CanonicalizationPolicy
): ArraySemantics {
  const exact = policy.pathSemanticsMap[propertyPath];
  if (exact !== undefined) {
    return exact;
  }

  const wildcard = toWildcardPath(propertyPath);
  const wildcardMatch = policy.pathSemanticsMap[wildcard];
  if (wildcardMatch !== undefined) {
    return wildcardMatch;
  }

  return policy.defaultSemantics;
}

/**
 * Deterministic, stable hash-friendly serialization of a policy, used to
 * fold canonicalization-policy identity into finding identity (Section 18).
 */
export function serializePolicyForHashing(policy: CanonicalizationPolicy): string {
  const sortedEntries = Object.entries(policy.pathSemanticsMap).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  const normalized = {
    defaultSemantics: policy.defaultSemantics,
    pathSemanticsMap: sortedEntries,
  };
  return JSON.stringify(normalized);
}
