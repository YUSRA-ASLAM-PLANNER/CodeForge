
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

export async function verifyRepositoryPath(
  rootPath: string,
  architectureImportBoundaries?: ArchitectureImportBoundary[]
): Promise<VerificationResult> {
  const snapshot = await indexRepository(rootPath);
  const graph = buildContextGraphFromSnapshot(snapshot);
  const config = await loadCodeForgeConfig(rootPath);

  const autoDetectLayers =
    config.architecture?.autoDetectLayers ?? true;

  const detectedLayers = autoDetectLayers
    ? detectArchitectureLayers(
        snapshot.files.map((file) => file.path)
      )
    : [];

  const detectedBoundaries = autoDetectLayers
    ? detectDefaultArchitectureBoundaries(detectedLayers)
    : [];

  const configuredBoundaries =
    architectureImportBoundaries ??
    config.architecture?.importBoundaries ??
    [];

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

  return verifyRepository(
    snapshot,
    graph,
    allBoundaries
  );
}
