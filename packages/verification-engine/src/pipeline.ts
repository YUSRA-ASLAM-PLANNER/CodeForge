
import { VerificationEngine } from "./engine";
import {
  contextGraphReferentialIntegrityRule,
  indexedFilesExistInContextGraphRule,
  contextGraphFilesExistInRepositoryRule,
  duplicateFileNodesRule,
  duplicateNodeIdsRule,
  fileNodesRequireValidPathsRule,
  validContextGraphEdgeKindsRule,
  repositoryNodeRequiredRule,
  repositoryNodeIdRule,
  repositoryNodeMustBeRootRule,
  selfReferentialEdgeRule,
  duplicateEdgesRule,
  orphanNodeRule,
  repositoryContainsAllTopLevelFilesRule,
  directoryNodesRequireValidPathsRule,
  fileNodesRequireParentRule,
  containsEdgesMustPointParentToChildRule,
  containsEdgesMustMatchPathsRule,
  containsEdgesMustMatchPathsRule022,
  fileNodesMustMatchRepositoryFilesRule,
  directoryNodesMustMatchRepositoryStructureRule,
  internalImportsMustResolveRule023,
  importBoundaryEnforcementRule024,
  circularDependencyDetectionRule026
} from "./rules";

import type {
  VerificationResult,
  ArchitectureImportBoundary
} from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { ContextGraph } from "@codeforge/context-graph";

export function verifyRepository(
  repository: RepositorySnapshot,
  graph: ContextGraph,
  architectureImportBoundaries: ArchitectureImportBoundary[] = []
): VerificationResult {
  const engine = new VerificationEngine();

  engine.addRule(contextGraphReferentialIntegrityRule);
  engine.addRule(indexedFilesExistInContextGraphRule);
  engine.addRule(contextGraphFilesExistInRepositoryRule);
  engine.addRule(duplicateFileNodesRule);
  engine.addRule(duplicateNodeIdsRule);
  engine.addRule(fileNodesRequireValidPathsRule);
  engine.addRule(validContextGraphEdgeKindsRule);
  engine.addRule(repositoryNodeRequiredRule);
  engine.addRule(repositoryNodeIdRule);
  engine.addRule(repositoryNodeMustBeRootRule);
  engine.addRule(selfReferentialEdgeRule);
  engine.addRule(duplicateEdgesRule);
  engine.addRule(orphanNodeRule);
  engine.addRule(repositoryContainsAllTopLevelFilesRule);
  engine.addRule(directoryNodesRequireValidPathsRule);
  engine.addRule(fileNodesRequireParentRule);
  engine.addRule(containsEdgesMustPointParentToChildRule);
  engine.addRule(containsEdgesMustMatchPathsRule);
  engine.addRule(containsEdgesMustMatchPathsRule022);
  engine.addRule(fileNodesMustMatchRepositoryFilesRule);
  engine.addRule(directoryNodesMustMatchRepositoryStructureRule);
  engine.addRule(internalImportsMustResolveRule023);
  engine.addRule(importBoundaryEnforcementRule024);
  engine.addRule(circularDependencyDetectionRule026);

  return engine.verify({
    files: repository.files.map((file) => file.path),
    imports: repository.files
      .filter((file) => file.imports && file.imports.length > 0)
      .map((file) => ({
        path: file.path,
        specifiers: file.imports!
      })),
    architectureImportBoundaries,
    graph
  });
}
