import type { JsonValue } from "../domain/models";
import { CanonicalizationPolicy, resolvePathSemantics } from "./policy";

/**
 * Recursively canonicalize a JSON value:
 *   - object keys are sorted deterministically (lexicographic on UTF-16 code
 *     units, i.e. plain `<`/`>` string comparison);
 *   - arrays are handled per the resolved path semantics:
 *       ORDERED   -> element order preserved, elements canonicalized in place
 *       UNORDERED -> elements canonicalized first, then sorted by their
 *                    canonical JSON serialization (so ordering is itself
 *                    deterministic and independent of input order).
 *
 * Never mutates the input. Always returns new structures.
 */
export function canonicalizeValue(
  value: JsonValue,
  policy: CanonicalizationPolicy,
  path: string = "$"
): JsonValue {
  if (value === null || typeof value !== "object") {
    // string | number | boolean | null are already canonical scalars.
    return value;
  }

  if (Array.isArray(value)) {
    const semantics = resolvePathSemantics(path, policy);
    const canonicalizedElements = value.map((el, idx) =>
      canonicalizeValue(el, policy, `${path}[${idx}]`)
    );

    if (semantics === "ORDERED") {
      return canonicalizedElements;
    }

    // UNORDERED: sort by canonical serialization for deterministic output.
    return [...canonicalizedElements].sort((a, b) => {
      const sa = canonicalJsonStringify(a);
      const sb = canonicalJsonStringify(b);
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    });
  }

  // Plain object.
  const obj = value as { [key: string]: JsonValue };
  const sortedKeys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const result: { [key: string]: JsonValue } = {};
  for (const key of sortedKeys) {
    result[key] = canonicalizeValue(obj[key] as JsonValue, policy, `${path}.${key}`);
  }
  return result;
}

/**
 * Deterministic canonical JSON serialization of an already-canonicalized
 * (or canonicalizable) value. Object keys are re-sorted defensively so this
 * function is safe to call on any structurally-canonical value even if it
 * was not produced by `canonicalizeValue`.
 */
export function canonicalJsonStringify(value: JsonValue): string {
  return stringifyCanonical(value);
}

function stringifyCanonical(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Cannot canonically serialize non-finite number");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stringifyCanonical).join(",")}]`;
  }
  const obj = value as { [key: string]: JsonValue };
  const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stringifyCanonical(obj[k] as JsonValue)}`);
  return `{${parts.join(",")}}`;
}

/**
 * Convenience: canonicalize then serialize in one step, using the resolved
 * path semantics for arrays.
 */
export function canonicalize(value: JsonValue, policy: CanonicalizationPolicy): string {
  return canonicalJsonStringify(canonicalizeValue(value, policy, "$"));
}
