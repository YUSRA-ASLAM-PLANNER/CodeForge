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
fileNodesMustMatchRepositoryFilesRule
} from "./rules";

import type { VerificationResult } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";
import type { ContextGraph } from "@codeforge/context-graph";

export function verifyRepository(
  repository: RepositorySnapshot,
  graph: ContextGraph
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
engine.addRule(fileNodesMustMatchRepositoryFilesRule);
  return engine.verify({
    files: repository.files.map((file) => file.path),
    graph
  });
}