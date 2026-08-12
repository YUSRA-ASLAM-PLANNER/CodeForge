import { VerificationEngine } from "./engine";
import {
  contextGraphReferentialIntegrityRule,
  indexedFilesExistInContextGraphRule
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

  return engine.verify({
    files: repository.files.map((file) => file.path),
    graph
  });
}
