import { ContextGraphBuilder } from "./builder";
import type { ContextGraph } from "./models";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";

export function buildContextGraph(
  files: Array<{ path: string }>
): ContextGraph {
  const graph = new ContextGraphBuilder();

  graph.addNode(
    "repository:root",
    "repository",
    "CodeForge"
  );

  const directories = new Set<string>();

  for (const file of files) {
    const parts = file.path.split("/");

    for (let i = 1; i < parts.length; i++) {
      directories.add(parts.slice(0, i).join("/"));
    }
  }

  const sortedDirectories = [...directories].sort(
    (a, b) => a.localeCompare(b)
  );

  for (const directory of sortedDirectories) {
    const id = `directory:${directory}`;

    graph.addNode(
      id,
      "directory",
      directory,
      directory
    );

    const parentPath = directory.includes("/")
      ? directory.slice(0, directory.lastIndexOf("/"))
      : null;

    if (parentPath) {
      graph.addEdge(
        `directory:${parentPath}`,
        id,
        "contains"
      );
    } else {
      graph.addEdge(
        "repository:root",
        id,
        "contains"
      );
    }
  }

  for (const file of files) {
    const id = `file:${file.path}`;

    graph.addNode(
      id,
      "file",
      file.path,
      file.path
    );

    const lastSlash = file.path.lastIndexOf("/");

    if (lastSlash === -1) {
      graph.addEdge(
        "repository:root",
        id,
        "contains"
      );
    } else {
      const parentDirectory = file.path.slice(0, lastSlash);

      graph.addEdge(
        `directory:${parentDirectory}`,
        id,
        "contains"
      );
    }
  }

  return graph.build();
}

export function buildContextGraphFromSnapshot(
  snapshot: RepositorySnapshot
): ContextGraph {
  return buildContextGraph(snapshot.files);
}