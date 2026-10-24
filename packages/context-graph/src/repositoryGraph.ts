
import { ContextGraphBuilder } from "./builder";
import type { ContextGraph } from "./models";
import type {
  RepositoryFile,
  RepositorySnapshot
} from "@codeforge/repository-indexer";

type GraphFile = Pick<RepositoryFile, "path"> & {
  imports?: string[];
  resolvedImports?: string[];
};

const RESOLVABLE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs"
];

function resolveInternalImport(
  importerPath: string,
  importSpecifier: string,
  knownPaths: Set<string>
): string | undefined {
  if (!importSpecifier.startsWith(".")) {
    return undefined;
  }

  const parts = importerPath.split("/");
  parts.pop();

  for (const part of importSpecifier.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;

    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else {
      parts.push(part);
    }
  }

  const resolvedPath = parts.join("/");
  const candidates = [
    resolvedPath,
    ...RESOLVABLE_EXTENSIONS.map(
      (extension) => `${resolvedPath}${extension}`
    ),
    ...RESOLVABLE_EXTENSIONS.map(
      (extension) => `${resolvedPath}/index${extension}`
    )
  ];

  return candidates.find((candidate) => knownPaths.has(candidate));
}

export function buildContextGraph(files: GraphFile[]): ContextGraph {
  const graph = new ContextGraphBuilder();

  graph.addNode("repository:root", "repository", "CodeForge");

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

    graph.addNode(id, "directory", directory, directory);

    const parentPath = directory.includes("/")
      ? directory.slice(0, directory.lastIndexOf("/"))
      : null;

    if (parentPath) {
      graph.addEdge(`directory:${parentPath}`, id, "contains");
    } else {
      graph.addEdge("repository:root", id, "contains");
    }
  }

  for (const file of files) {
    const id = `file:${file.path}`;

    graph.addNode(id, "file", file.path, file.path);

    const lastSlash = file.path.lastIndexOf("/");

    if (lastSlash === -1) {
      graph.addEdge("repository:root", id, "contains");
    } else {
      const parentDirectory = file.path.slice(0, lastSlash);
      graph.addEdge(`directory:${parentDirectory}`, id, "contains");
    }
  }

  const knownPaths = new Set(files.map((file) => file.path));
  const importEdges = new Set<string>();

  for (const file of files) {
    const targets = new Set<string>();

    for (const importSpecifier of file.imports ?? []) {
      const targetPath = resolveInternalImport(
        file.path,
        importSpecifier,
        knownPaths
      );

      if (targetPath) {
        targets.add(targetPath);
      }
    }

    for (const resolvedPath of file.resolvedImports ?? []) {
      if (knownPaths.has(resolvedPath)) {
        targets.add(resolvedPath);
      }
    }

    for (const targetPath of targets) {
      if (targetPath === file.path) continue;

      const edgeKey = `${file.path}->${targetPath}`;

      if (importEdges.has(edgeKey)) continue;
      importEdges.add(edgeKey);

      graph.addEdge(
        `file:${file.path}`,
        `file:${targetPath}`,
        "imports"
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
