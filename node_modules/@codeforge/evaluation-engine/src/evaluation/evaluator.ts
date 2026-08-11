import type {
  ArtifactReference,
  Chapter14EvaluationContext,
  ConformanceFinding,
  Criterion,
  ObservedEvidence,
  StructuredSufficiencyCondition,
} from "../domain/models";
import { CanonicalizationPolicy } from "../canonicalization/policy";
import { authenticateEvidence } from "../canonicalization/evidenceIntegrity";
import { isCriterionApplicable } from "./applicability";
import { evaluateSufficiency } from "./sufficiency";
import { evaluateStructuredPredicate } from "./predicates";
import { constructFinding } from "../findings/finding";
import { ValidationError } from "../errors";

export interface EvaluateOptions {
  readonly context: Chapter14EvaluationContext;
  readonly canonicalizationPolicy: CanonicalizationPolicy;
}

/**
 * Deterministically evaluate every (artifact, criterion) pair, applying:
 *   applicability -> evidence sufficiency -> structured predicate
 * in that order (Section 25 / 26). Ordering of returned findings is
 * deterministic: outer loop over `criteria` in input order, inner loop
 * over `artifacts` in input order.
 */
export function evaluateAll(options: EvaluateOptions): ConformanceFinding[] {
  const { context, canonicalizationPolicy } = options;
  const findings: ConformanceFinding[] = [];

  for (const criterion of context.criteria) {
    if (criterion.structured_predicate === undefined) {
      // Defense-in-depth: validateDomain() should already have rejected
      // this upstream (Section 6). Fail loudly rather than silently.
      throw new ValidationError(
        `Criterion '${criterion.criterion_id}' lacks a structured predicate.`
      );
    }

    const evidenceRequirements = context.evidence_requirements.filter(
      (er) => er.criterion_id === criterion.criterion_id
    );
    const flattenedSufficiencyConditions: StructuredSufficiencyCondition[] =
      evidenceRequirements.flatMap((er) => er.sufficiency_conditions);

    for (const artifact of context.artifacts) {
      findings.push(
        evaluateOne(
          criterion,
          artifact,
          context,
          evidenceRequirements.map((er) => ({
            evidenceClass: er.evidence_class,
            conditions: er.sufficiency_conditions,
          })),
          flattenedSufficiencyConditions,
          canonicalizationPolicy
        )
      );
    }
  }

  return findings;
}

function evidenceForArtifactAndClass(
  context: Chapter14EvaluationContext,
  artifactId: string,
  evidenceClass: string
): ObservedEvidence[] {
  return context.observed_evidence.filter(
    (e) => e.artifact_id === artifactId && e.evidence_class === evidenceClass
  );
}

function evaluateOne(
  criterion: Criterion,
  artifact: ArtifactReference,
  context: Chapter14EvaluationContext,
  evidenceRequirementScopes: readonly {
    readonly evidenceClass: string;
    readonly conditions: readonly StructuredSufficiencyCondition[];
  }[],
  flattenedSufficiencyConditions: readonly StructuredSufficiencyCondition[],
  policy: CanonicalizationPolicy
): ConformanceFinding {
  const predicate = criterion.structured_predicate!;

  // 1. Applicability — evaluated first; Not Applicable requires no evidence
  //    and never executes the predicate.
  if (!isCriterionApplicable(criterion, artifact)) {
    return constructFinding({
      targetArtifactId: artifact.artifact_id,
      requirementId: criterion.requirement_id,
      criterionId: criterion.criterion_id,
      resultState: "Not Applicable",
      rationale: `Artifact '${artifact.artifact_id}' is outside the applicability scope of ` +
        `criterion '${criterion.criterion_id}'.`,
      predicate,
      sufficiencyConditions: flattenedSufficiencyConditions,
      evidenceItems: [],
      canonicalizationPolicy: policy,
    });
  }

  // 2. Evidence sufficiency — evaluated before the predicate. Insufficiency
  //    from ANY declared evidence requirement short-circuits predicate
  //    evaluation and is never converted into Non-Conforming.
  const insufficiencyReasons: string[] = [];
  const evidenceUsed = new Map<string, ObservedEvidence>();

  if (evidenceRequirementScopes.length === 0) {
    // No declared evidence requirement: fall back to requiring at least one
    // evidence item of the predicate's own evidence class to exist, so a
    // criterion can never silently pass its predicate against zero evidence.
    const scoped = evidenceForArtifactAndClass(context, artifact.artifact_id, predicate.evidence_class);
    if (scoped.length === 0) {
      insufficiencyReasons.push(
        `No evidence of class '${predicate.evidence_class}' available for artifact ` +
          `'${artifact.artifact_id}'.`
      );
    }
    for (const e of scoped) evidenceUsed.set(e.evidence_id, e);
  } else {
    for (const scope of evidenceRequirementScopes) {
      const scoped = evidenceForArtifactAndClass(context, artifact.artifact_id, scope.evidenceClass);
      for (const e of scoped) evidenceUsed.set(e.evidence_id, e);
      const result = evaluateSufficiency(scope.conditions, scoped);
      if (!result.sufficient) {
        insufficiencyReasons.push(...result.reasons);
      }
    }
  }

  if (insufficiencyReasons.length > 0) {
    const evidenceItems = [...evidenceUsed.values()].map((evidence) => ({
      evidence,
      integrityIdentifier: authenticateEvidence(evidence, policy),
    }));
    return constructFinding({
      targetArtifactId: artifact.artifact_id,
      requirementId: criterion.requirement_id,
      criterionId: criterion.criterion_id,
      resultState: "Insufficient Evidence",
      rationale: insufficiencyReasons.join(" "),
      predicate,
      sufficiencyConditions: flattenedSufficiencyConditions,
      evidenceItems,
      canonicalizationPolicy: policy,
    });
  }

  // 3. Structured predicate — evaluated only after applicability and
  //    sufficiency both pass. Predicate evidence is strictly scoped by
  //    (artifact_id, predicate.evidence_class).
  const predicateScopedEvidence = evidenceForArtifactAndClass(
    context,
    artifact.artifact_id,
    predicate.evidence_class
  );
  for (const e of predicateScopedEvidence) evidenceUsed.set(e.evidence_id, e);

  const predicateResult = evaluateStructuredPredicate(predicate, predicateScopedEvidence);

  const evidenceItems = [...evidenceUsed.values()].map((evidence) => ({
    evidence,
    integrityIdentifier: authenticateEvidence(evidence, policy),
  }));

  return constructFinding({
    targetArtifactId: artifact.artifact_id,
    requirementId: criterion.requirement_id,
    criterionId: criterion.criterion_id,
    resultState: predicateResult.satisfied ? "Conforming" : "Non-Conforming",
    rationale: predicateResult.satisfied
      ? `All applicability, sufficiency, and predicate checks passed for criterion ` +
        `'${criterion.criterion_id}'.`
      : predicateResult.violations.join(" "),
    predicate,
    sufficiencyConditions: flattenedSufficiencyConditions,
    evidenceItems,
    canonicalizationPolicy: policy,
  });
}
