import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ContextGraph } from "@codeforge/context-graph";
import type { RepositorySnapshot } from "@codeforge/repository-indexer";

export type RepositoryImpact = {
  targetFile: string;
  directDependents: string[];
  transitiveDependents: string[];
  impactChains: Array<{ file: string; path: string[] }>;
  summary: { direct: number; transitive: number; totalAffected: number };
};

export function resolveImpactTarget(
  repositoryPath: string,
  requestedPath: string,
  snapshot: RepositorySnapshot
): string {
  const root = resolve(repositoryPath);
  const absoluteTarget = resolve(root, requestedPath);
  const relativeTarget = relative(root, absoluteTarget);
  if (
    relativeTarget === "" || relativeTarget === ".." ||
    relativeTarget.startsWith(`..${sep}`) || isAbsolute(relativeTarget)
  ) {
    throw new Error(`Impact target must be a file inside the repository: ${requestedPath}`);
  }

  const normalizedTarget = relativeTarget.split(sep).join("/");
  const indexedPath = snapshot.files.find((file) =>
    process.platform === "win32"
      ? file.path.toLowerCase() === normalizedTarget.toLowerCase()
      : file.path === normalizedTarget
  )?.path;
  if (!indexedPath) {
    throw new Error(`Impact target is not an indexed repository file: ${normalizedTarget}`);
  }
  return indexedPath;
}

function filePathFromSymbolId(symbolId: string): string | undefined {
  if (!symbolId.startsWith("symbol:")) return undefined;
  const body = symbolId.slice("symbol:".length);
  const separator = body.lastIndexOf("#");
  return separator > 0 ? body.slice(0, separator) : undefined;
}

export function calculateRepositoryImpact(
  snapshot: RepositorySnapshot,
  graph: ContextGraph,
  targetFile: string
): RepositoryImpact {
  const indexedFiles = new Set(snapshot.files.map((file) => file.path));
  const reverseDependencies = new Map<string, Set<string>>();
  const addDependency = (dependency: string | undefined, dependent: string | undefined): void => {
    if (!dependency || !dependent || dependency === dependent) return;
    if (!indexedFiles.has(dependency) || !indexedFiles.has(dependent)) return;
    const dependents = reverseDependencies.get(dependency) ?? new Set<string>();
    dependents.add(dependent);
    reverseDependencies.set(dependency, dependents);
  };

  for (const edge of graph.edges) {
    if (edge.kind === "imports" && edge.from.startsWith("file:") && edge.to.startsWith("file:")) {
      addDependency(edge.to.slice("file:".length), edge.from.slice("file:".length));
    } else if (edge.kind === "references") {
      addDependency(filePathFromSymbolId(edge.to), filePathFromSymbolId(edge.from));
    }
  }

  const directDependents = [...(reverseDependencies.get(targetFile) ?? [])].sort();
  const directSet = new Set(directDependents);
  const paths = new Map(directDependents.map((file) => [file, [targetFile, file]]));
  const pending = [...directDependents];
  for (let index = 0; index < pending.length; index += 1) {
    const current = pending[index];
    const currentPath = paths.get(current)!;
    for (const dependent of [...(reverseDependencies.get(current) ?? [])].sort()) {
      if (dependent === targetFile || paths.has(dependent)) continue;
      paths.set(dependent, [...currentPath, dependent]);
      pending.push(dependent);
    }
  }

  const transitiveDependents = [...paths.keys()].filter((file) => !directSet.has(file)).sort();
  const impactChains = [...paths.entries()]
    .map(([file, path]) => ({ file, path }))
    .sort((left, right) =>
      left.path.length - right.path.length ||
      (left.file < right.file ? -1 : left.file > right.file ? 1 : 0)
    );
  return {
    targetFile,
    directDependents,
    transitiveDependents,
    impactChains,
    summary: {
      direct: directDependents.length,
      transitive: transitiveDependents.length,
      totalAffected: paths.size
    }
  };
}
