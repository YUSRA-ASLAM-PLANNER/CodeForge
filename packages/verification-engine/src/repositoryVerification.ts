
import { indexRepository } from "@codeforge/repository-indexer";
import { buildContextGraphFromSnapshot } from "@codeforge/context-graph";
import { verifyRepository } from "./pipeline";
import { loadCodeForgeConfig } from "./config";
import {
  detectArchitectureLayers,
  detectDefaultArchitectureBoundaries
} from "./architecture";

import type {
  VerificationResult,
  ArchitectureImportBoundary
} from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { ContextGraph } from "@codeforge/context-graph";

export type RepositoryVerificationAnalysis = {
  snapshot: RepositorySnapshot;
  graph: ContextGraph;
  architectureImportBoundaries: ArchitectureImportBoundary[];
  architectureConfiguration: {
    autoDetectionEnabled: boolean;
    layers: Array<{ name: string; fileCount: number; sampleFiles: string[] }>;
    suggestedBoundaries: ArchitectureImportBoundary[];
    automaticBoundaries: ArchitectureImportBoundary[];
    configuredBoundaries: ArchitectureImportBoundary[];
    configuredBoundarySource: ".codeforge.yaml" | "codeforge.config.json" | "analysis options" | "none";
    effectiveBoundaries: ArchitectureImportBoundary[];
  };
  result: VerificationResult;
};

export async function analyzeRepositoryPath(
  rootPath: string,
  architectureImportBoundaries?: ArchitectureImportBoundary[]
): Promise<RepositoryVerificationAnalysis> {
  const config = await loadCodeForgeConfig(rootPath);
  const snapshot = await indexRepository(
    rootPath,
    undefined,
    undefined,
    config.scan?.exclude
  );
  const graph = buildContextGraphFromSnapshot(snapshot);

  const autoDetectLayers =
    config.architecture?.autoDetectLayers ?? true;

  const configuredBoundaries =
    architectureImportBoundaries ??
    config.architecture?.importBoundaries ??
    [];
  const configuredBoundarySource = architectureImportBoundaries !== undefined
    ? "analysis options"
    : config.source ?? "none";

  const detectedLayers = detectArchitectureLayers(
    snapshot.files.map((file) => file.path),
    configuredBoundaries.flatMap(({ from, to }) => [from, to])
  );
  const suggestedBoundaries = detectDefaultArchitectureBoundaries(detectedLayers);
  const detectedBoundaries = autoDetectLayers ? suggestedBoundaries : [];

  const allBoundaries = [
    ...detectedBoundaries,
    ...configuredBoundaries
  ].filter(
    (boundary, index, boundaries) =>
      boundaries.findIndex(
        (candidate) =>
          candidate.from.toLowerCase() === boundary.from.toLowerCase() &&
          candidate.to.toLowerCase() === boundary.to.toLowerCase()
      ) === index
  );

  const result = verifyRepository(snapshot, graph, allBoundaries);

  return {
    snapshot,
    graph,
    architectureImportBoundaries: allBoundaries,
    architectureConfiguration: {
      autoDetectionEnabled: autoDetectLayers,
      layers: detectedLayers.map(({ name, files }) => ({
        name,
        fileCount: files.length,
        sampleFiles: files.slice(0, 3)
      })),
      suggestedBoundaries,
      automaticBoundaries: detectedBoundaries,
      configuredBoundaries,
      configuredBoundarySource,
      effectiveBoundaries: allBoundaries
    },
    result
  };
}

export async function verifyRepositoryPath(
  rootPath: string,
  architectureImportBoundaries?: ArchitectureImportBoundary[]
): Promise<VerificationResult> {
  const analysis = await analyzeRepositoryPath(
    rootPath,
    architectureImportBoundaries
  );

  return analysis.result;
}
