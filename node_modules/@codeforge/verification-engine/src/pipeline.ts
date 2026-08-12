import { VerificationEngine } from "./engine";
import { contextGraphReferentialIntegrityRule } from "./rules";
import type { VerificationResult } from "./models";

export type IndexedRepository = {
  files: string[];
};

export type RepositoryGraph = {
  nodes: Array<{
    id: string;
    kind: string;
    label: string;
    path?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    kind: string;
  }>;
};

export function verifyRepository(
  repository: IndexedRepository,
  graph: RepositoryGraph
): VerificationResult {
  const engine = new VerificationEngine();

  engine.addRule(contextGraphReferentialIntegrityRule);

  return engine.verify({
    files: repository.files,
    graph
  });
}
