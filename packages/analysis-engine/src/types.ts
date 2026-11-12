import type {
  Baseline,
  Chapter14EvaluationContext,
  ConformanceFinding,
  Criterion,
  EvidenceRequirement,
  ObservedEvidence,
  Requirement,
  TraceabilityLink
} from "@codeforge/evaluation-engine";
import type { ContextGraph } from "@codeforge/context-graph";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { VerificationResult, ArchitectureImportBoundary } from "@codeforge/verification-engine";

export interface Chapter14Specification {
  readonly requirements: readonly Requirement[];
  readonly criteria: readonly Criterion[];
  readonly evidence_requirements: readonly EvidenceRequirement[];
  readonly traceability_links?: readonly TraceabilityLink[];
}

export interface AnalysisConfiguration {
  readonly repositoryPath: string;
  readonly baseline: Baseline;
  readonly specification: Chapter14Specification;
  readonly walPath: string;
  readonly architectureImportBoundaries?: readonly ArchitectureImportBoundary[];
}

export type AnalysisPhase =
  | "repository_discovery"
  | "dependency_graph"
  | "architectural_verification"
  | "evidence_production"
  | "chapter14_validation"
  | "chapter14_evaluation"
  | "finding_persistence";

export interface AnalysisPersistenceResult {
  readonly walPath: string;
  readonly newlyPersistedCount: number;
  readonly alreadyPersistedCount: number;
}

export interface AnalysisResult {
  readonly repository: RepositorySnapshot;
  readonly dependencyGraph: ContextGraph;
  readonly verification: VerificationResult;
  readonly observedEvidence: readonly ObservedEvidence[];
  readonly evaluationContext: Chapter14EvaluationContext;
  readonly findings: readonly ConformanceFinding[];
  readonly persistence: AnalysisPersistenceResult;
  readonly completedPhases: readonly AnalysisPhase[];
}
