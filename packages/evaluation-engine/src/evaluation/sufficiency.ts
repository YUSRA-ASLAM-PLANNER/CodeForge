import type {
  JsonValue,
  ObservedEvidence,
  StructuredSufficiencyCondition,
} from "../domain/models";

export interface SufficiencyEvaluationResult {
  readonly sufficient: boolean;
  readonly reasons: readonly string[];
}

function hasTopLevelAttribute(payload: JsonValue, attribute: string): boolean {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(payload, attribute);
}

function hasTopLevelKey(payload: JsonValue, key: string): boolean {
  // CONTAIN_KEY is semantically identical to attribute presence for object
  // payloads; kept as a distinct predicate type per the domain contract so
  // schemas/tests can express "any key" intent independently of a named
  // attribute check, but the underlying check is the same operation.
  return hasTopLevelAttribute(payload, key);
}

/**
 * Evaluate structured sufficiency conditions against evidence items already
 * scoped to (artifact_id, evidence_class). Deterministic and artifact-scoped
 * per Section 8. Every declared condition must hold (AND semantics) — a
 * requirement can layer multiple conditions (e.g. CONTAIN_ATTRIBUTE +
 * MIN_COUNT) and all must be satisfied for evidence to be sufficient.
 *
 * Insufficient evidence is reported via `sufficient: false` and never
 * silently converted into a predicate failure by this layer — the caller
 * is responsible for mapping insufficiency to the "Insufficient Evidence"
 * result state rather than "Non-Conforming" (Section 8).
 */
export function evaluateSufficiency(
  conditions: readonly StructuredSufficiencyCondition[],
  scopedEvidence: readonly ObservedEvidence[]
): SufficiencyEvaluationResult {
  const reasons: string[] = [];

  if (scopedEvidence.length === 0) {
    return {
      sufficient: false,
      reasons: ["No evidence available for the required evidence class."],
    };
  }

  for (const condition of conditions) {
    switch (condition.type) {
      case "CONTAIN_ATTRIBUTE": {
        const found = scopedEvidence.some((e) =>
          hasTopLevelAttribute(e.payload, condition.attribute)
        );
        if (!found) {
          reasons.push(
            `No evidence item contains required attribute '${condition.attribute}'.`
          );
        }
        break;
      }
      case "CONTAIN_KEY": {
        const found = scopedEvidence.some((e) => hasTopLevelKey(e.payload, condition.key));
        if (!found) {
          reasons.push(`No evidence item contains required key '${condition.key}'.`);
        }
        break;
      }
      case "MIN_COUNT": {
        if (scopedEvidence.length < condition.min_count) {
          reasons.push(
            `Expected at least ${condition.min_count} evidence item(s) of class ` +
              `'${condition.evidence_class}', found ${scopedEvidence.length}.`
          );
        }
        break;
      }
    }
  }

  return { sufficient: reasons.length === 0, reasons };
}
