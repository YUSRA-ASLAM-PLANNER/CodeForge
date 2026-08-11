import { readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import type { RepositoryFile, RepositorySnapshot } from "./models";

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "dist-tests"
]);

export async function indexRepository(
  rootPath: string,
  ignoredDirectories: Set<string> = DEFAULT_IGNORED_DIRECTORIES
): Promise<RepositorySnapshot> {
  const files: RepositoryFile[] = [];

  async function walk(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
        continue;
      }

      const fullPath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const fileStat = await stat(fullPath);

      files.push({
        path: relative(rootPath, fullPath).replace(/\\/g, "/"),
        extension: extname(entry.name),
        sizeBytes: fileStat.size
      });
    }
  }

  await walk(rootPath);

  files.sort((a, b) => a.path.localeCompare(b.path));

  return {
    rootPath,
    files,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0)
  };
}
