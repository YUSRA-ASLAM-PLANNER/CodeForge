import { mkdir } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import {
  DEFAULT_CANONICALIZATION_POLICY,
  evaluateAll,
  FindingStore,
  validateDomain,
  validateSchema
} from "@codeforge/evaluation-engine";
import type { ArtifactReference, Chapter14EvaluationContext } from "@codeforge/evaluation-engine";
import { analyzeRepositoryPath } from "@codeforge/verification-engine";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import { AIRemediationEngine, type RemediationPatch } from "@codeforge/ai-remediation";
import { produceRepositoryEvidence } from "./evidence";
import type { AnalysisConfiguration, AnalysisPhase, AnalysisResult } from "./types";

const COMPLETED_PHASES: readonly AnalysisPhase[] = [
  "repository_discovery",
  "dependency_graph",
  "architectural_verification",
  "evidence_production",
  "chapter14_validation",
  "chapter14_evaluation",
  "finding_persistence"
];

function buildArtifacts(
  configuration: AnalysisConfiguration,
  snapshot: RepositorySnapshot
): ArtifactReference[] {
  const baselineId = configuration.baseline.baseline_id;
  const repository = {
    artifact_id: "repository:root",
    artifact_type: "repository",
    tags: ["repository"],
    baseline_id: baselineId
  } satisfies ArtifactReference;

  const files = snapshot.files.map((file) => ({
    artifact_id: `file:${file.path}`,
    artifact_type: file.imports === undefined ? "repository-file" : "source-file",
    tags: [
      `extension:${file.extension || "none"}`,
      ...(file.imports === undefined ? [] : ["source"])
    ],
    baseline_id: baselineId
  } satisfies ArtifactReference));

  return [repository, ...files];
}

export async function analyzeRepository(
  configuration: AnalysisConfiguration & { remediate?: boolean }
): Promise<AnalysisResult & { remediations?: RemediationPatch[] }> {
  const repositoryAnalysis = await analyzeRepositoryPath(
    configuration.repositoryPath,
    configuration.architectureImportBoundaries
      ? [...configuration.architectureImportBoundaries]
      : undefined
  );
  const artifacts = buildArtifacts(configuration, repositoryAnalysis.snapshot);
  const observedEvidence = produceRepositoryEvidence({
    snapshot: repositoryAnalysis.snapshot,
    graph: repositoryAnalysis.graph,
    verification: repositoryAnalysis.result,
    architectureImportBoundaries:
      repositoryAnalysis.architectureImportBoundaries
  });

  const rawEvaluationContext: unknown = {
    requirements: configuration.specification.requirements,
    criteria: configuration.specification.criteria,
    evidence_requirements:
      configuration.specification.evidence_requirements,
    observed_evidence: observedEvidence,
    artifacts,
    baselines: [configuration.baseline],
    traceability_links:
      configuration.specification.traceability_links ?? []
  };
  const evaluationContext: Chapter14EvaluationContext =
    validateSchema(rawEvaluationContext);
  validateDomain(evaluationContext);

  const findings = evaluateAll({
    context: evaluationContext,
    canonicalizationPolicy: DEFAULT_CANONICALIZATION_POLICY
  });

  const walPath = isAbsolute(configuration.walPath)
    ? configuration.walPath
    : resolve(configuration.repositoryPath, configuration.walPath);
  await mkdir(dirname(walPath), { recursive: true });
  const store = new FindingStore(walPath);
  store.loadAll();

  const newlyPersistedCount = store.persistMany(findings);
  const alreadyPersistedCount = findings.length - newlyPersistedCount;

  const remediations: RemediationPatch[] = [];
  if (configuration.remediate) {
    const remediationEngine = new AIRemediationEngine({
      apiKey: process.env.GEMINI_API_KEY
    });

    const nonConformingFindings = findings.filter(
      (f) => String(f.result_state).toUpperCase() === "NON_CONFORMING" || String(f.result_state) === "NONCONFORMING"
    );

    for (const finding of nonConformingFindings) {
      const targetFile = finding.target_artifact_id || "unknown";
      const fileEntry = repositoryAnalysis.snapshot.files.find((f) => f.path === targetFile);
      const sourceCode = (fileEntry as { content?: string } | undefined)?.content ?? "";

      const patch = await remediationEngine.generateFix(
        {
          finding_id: finding.finding_id,
          rule_id: finding.criterion_id,
          target: targetFile,
          message: `Requirement ${finding.requirement_id} violated`
        },
        sourceCode
      );
      remediations.push(patch);
    }
  }

  return {
    repository: repositoryAnalysis.snapshot,
    dependencyGraph: repositoryAnalysis.graph,
    verification: repositoryAnalysis.result,
    observedEvidence,
    evaluationContext,
    findings,
    persistence: {
      walPath,
      newlyPersistedCount,
      alreadyPersistedCount
    },
    completedPhases: COMPLETED_PHASES,
    ...(configuration.remediate ? { remediations } : {})
  };
}