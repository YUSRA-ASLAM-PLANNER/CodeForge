import { ContextGraphBuilder } from "./builder";
import type { ContextGraph } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";

export function buildContextGraph(
  files: Array<{ path: string }>
): ContextGraph {
  const graph = new ContextGraphBuilder();

  graph.addNode(
    "repository",
    "repository",
    "CodeForge"
  );

  for (const file of files) {
    const id = `file:${file.path}`;

    graph.addNode(
      id,
      "file",
      file.path,
      file.path
    );

    graph.addEdge(
      "repository",
      id,
      "contains"
    );
  }

  return graph.build();
}

export function buildContextGraphFromSnapshot(
  snapshot: RepositorySnapshot
): ContextGraph {
  return buildContextGraph(snapshot.files);
}
