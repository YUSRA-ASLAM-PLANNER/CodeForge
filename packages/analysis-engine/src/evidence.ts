import {
  computeEvidenceIntegrityIdentifier,
  DEFAULT_CANONICALIZATION_POLICY,
  canonicalize,
  sha256Hex
} from "@codeforge/evaluation-engine";
import type {
  EvidenceClass,
  JsonValue,
  ObservedEvidence
} from "@codeforge/evaluation-engine";
import type { ContextGraph } from "@codeforge/context-graph";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type {
  ArchitectureImportBoundary,
  VerificationResult
} from "@codeforge/verification-engine";

function sortViolations(result: VerificationResult): JsonValue[] {
  return [...result.violations]
    .sort((left, right) => {
      const leftKey = `${left.ruleId}|${left.target ?? ""}|${left.message}`;
      const rightKey = `${right.ruleId}|${right.target ?? ""}|${right.message}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    })
    .map((violation) => ({
      rule_id: violation.ruleId,
      severity: violation.severity,
      message: violation.message,
      target: violation.target ?? null
    }));
}

function sortedImportEdges(graph: ContextGraph): JsonValue[] {
  return graph.edges
    .filter((edge) => edge.kind === "imports")
    .map((edge) => ({ from: edge.from, to: edge.to }))
    .sort((left, right) => {
      const leftKey = `${left.from}|${left.to}`;
      const rightKey = `${right.from}|${right.to}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
}

function createEvidence(
  artifactId: string,
  evidenceClass: EvidenceClass,
  payload: JsonValue
): ObservedEvidence {
  const canonicalPayload = canonicalize(
    payload,
    DEFAULT_CANONICALIZATION_POLICY
  );
  const evidenceId = `evidence:${sha256Hex(
    `${artifactId}\n${evidenceClass}\n${canonicalPayload}`
  )}`;
  const evidence: ObservedEvidence = {
    evidence_id: evidenceId,
    artifact_id: artifactId,
    evidence_class: evidenceClass,
    payload
  };

  return {
    ...evidence,
    integrity_identifier: computeEvidenceIntegrityIdentifier(
      evidence,
      DEFAULT_CANONICALIZATION_POLICY
    )
  };
}

export function produceRepositoryEvidence(input: {
  snapshot: RepositorySnapshot;
  graph: ContextGraph;
  verification: VerificationResult;
  architectureImportBoundaries: readonly ArchitectureImportBoundary[];
}): ObservedEvidence[] {
  const { snapshot, graph, verification } = input;
  const repositoryArtifactId = "repository:root";
  const violations = sortViolations(verification);
  const importEdges = sortedImportEdges(graph);
  const callEdges = graph.edges
    .filter((edge) => edge.kind === "references" && edge.from.startsWith("symbol:") && edge.to.startsWith("symbol:"))
    .map((edge) => ({ from: edge.from, to: edge.to }))
    .sort((left, right) => `${left.from}|${left.to}`.localeCompare(`${right.from}|${right.to}`));
  const unresolvedImports = violations.filter((item) =>
    typeof item === "object" && item !== null && "rule_id" in item &&
    item.rule_id === "ARCH-023"
  );
  const circularDependencies = violations.filter((item) =>
    typeof item === "object" && item !== null && "rule_id" in item &&
    item.rule_id === "ARCH-026"
  );
  const boundaries = [...input.architectureImportBoundaries]
    .map((boundary) => ({ from: boundary.from, to: boundary.to }))
    .sort((left, right) => {
      const leftKey = `${left.from}|${left.to}`;
      const rightKey = `${right.from}|${right.to}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  const evidence: ObservedEvidence[] = [];

  for (const file of snapshot.files) {
    const artifactId = `file:${file.path}`;
    evidence.push(
      createEvidence(artifactId, "Structural", {
        path: file.path,
        extension: file.extension,
        size_bytes: file.sizeBytes,
        symbols: (file.symbols ?? []).map((symbol) => ({ ...symbol }))
      }),
      createEvidence(artifactId, "Dependency", {
        imports: file.imports ?? [],
        resolved_imports: file.resolvedImports ?? [],
        calls: file.calls ?? []
      })
    );
  }

  evidence.push(
    createEvidence(repositoryArtifactId, "Structural", {
      file_count: snapshot.fileCount,
      total_bytes: snapshot.totalBytes,
      verification_passed: verification.passed,
      violation_count: violations.length,
      analysis_warnings: snapshot.analysisWarnings ?? [],
      violations
    }),
    createEvidence(repositoryArtifactId, "Dependency", {
      import_edge_count: importEdges.length,
      import_edges: importEdges,
      symbol_count: graph.nodes.filter((node) => node.kind === "symbol").length,
      call_edge_count: callEdges.length,
      call_edges: callEdges,
      unresolved_imports: unresolvedImports,
      circular_dependencies: circularDependencies
    }),
    createEvidence(repositoryArtifactId, "Configuration", {
      architecture_import_boundaries: boundaries
    })
  );

  return evidence.sort((left, right) => {
    const leftKey = `${left.artifact_id}|${left.evidence_class}|${left.evidence_id}`;
    const rightKey = `${right.artifact_id}|${right.evidence_class}|${right.evidence_id}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}
