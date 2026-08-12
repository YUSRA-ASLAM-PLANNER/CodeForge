import { indexRepository } from "@codeforge/repository-indexer";
import { buildContextGraphFromSnapshot } from "@codeforge/context-graph";
import { verifyRepository } from "./pipeline";
import type { VerificationResult } from "./models";

export async function verifyRepositoryPath(
  rootPath: string
): Promise<VerificationResult> {
  const snapshot = await indexRepository(rootPath);
  const graph = buildContextGraphFromSnapshot(snapshot);

  return verifyRepository(snapshot, graph);
}
