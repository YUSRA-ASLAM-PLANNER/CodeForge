
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, extname, resolve, dirname } from "node:path";
import ts from "typescript";
import type { RepositoryFile, RepositorySnapshot } from "./models";

const DEFAULT_IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "dist-tests"
]);

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs"
]);

const RESOLVABLE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
  ".d.ts"
];

function extractImports(source: string, filePath: string): string[] {
  const extension = extname(filePath);

  const scriptKind =
    extension === ".tsx" ? ts.ScriptKind.TSX :
    extension === ".jsx" ? ts.ScriptKind.JSX :
    [".js", ".mjs", ".cjs"].includes(extension)
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS;

  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const imports = new Set<string>();

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.add(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      imports.add(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return [...imports].sort((a, b) => a.localeCompare(b));
}

function toRepositoryPath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).replace(/\\/g, "/");
}

function findExistingSourcePath(
  candidatePath: string,
  knownAbsolutePaths: Map<string, string>
): string | undefined {
  const normalizedCandidate = resolve(candidatePath);

  const candidates = [
    normalizedCandidate,
    ...RESOLVABLE_EXTENSIONS.map(
      (extension) => `${normalizedCandidate}${extension}`
    ),
    ...RESOLVABLE_EXTENSIONS.map(
      (extension) => join(normalizedCandidate, `index${extension}`)
    )
  ];

  for (const candidate of candidates) {
    const repositoryPath = knownAbsolutePaths.get(resolve(candidate));

    if (repositoryPath) {
      return repositoryPath;
    }
  }

  return undefined;
}

function resolvePathAlias(
  importSpecifier: string,
  importerAbsolutePath: string,
  rootPath: string,
  compilerOptions: ts.CompilerOptions,
  knownAbsolutePaths: Map<string, string>
): string | undefined {
  const configDirectory = rootPath;
  const paths = compilerOptions.paths;

  if (!paths) {
    return undefined;
  }

  const baseUrl = compilerOptions.baseUrl
    ? resolve(configDirectory, compilerOptions.baseUrl)
    : configDirectory;

  const matchingPatterns = Object.keys(paths)
    .map((pattern) => {
      const wildcardIndex = pattern.indexOf("*");

      if (wildcardIndex === -1) {
        return {
          pattern,
          prefix: pattern,
          suffix: "",
          wildcard: false
        };
      }

      return {
        pattern,
        prefix: pattern.slice(0, wildcardIndex),
        suffix: pattern.slice(wildcardIndex + 1),
        wildcard: true
      };
    })
    .filter((entry) =>
      entry.wildcard
        ? importSpecifier.startsWith(entry.prefix) &&
          importSpecifier.endsWith(entry.suffix) &&
          importSpecifier.length >= entry.prefix.length + entry.suffix.length
        : importSpecifier === entry.pattern
    )
    .sort((a, b) => b.prefix.length - a.prefix.length);

  for (const entry of matchingPatterns) {
    const matchedText = entry.wildcard
      ? importSpecifier.slice(
          entry.prefix.length,
          importSpecifier.length - entry.suffix.length
        )
      : "";

    for (const target of paths[entry.pattern] ?? []) {
      const substitutedTarget = target.replace("*", matchedText);
      const targetBase = compilerOptions.baseUrl
        ? baseUrl
        : dirname(join(rootPath, "tsconfig.json"));

      const candidatePath = resolve(targetBase, substitutedTarget);

      const resolved = findExistingSourcePath(
        candidatePath,
        knownAbsolutePaths
      );

      if (resolved) {
        return resolved;
      }
    }
  }

  // Keep the parameter available for future support of tsconfig inheritance.
  void importerAbsolutePath;

  return undefined;
}

function resolveImportPath(
  importSpecifier: string,
  importerAbsolutePath: string,
  rootPath: string,
  compilerOptions: ts.CompilerOptions,
  knownAbsolutePaths: Map<string, string>
): string | undefined {
  if (importSpecifier.startsWith(".")) {
    return findExistingSourcePath(
      resolve(dirname(importerAbsolutePath), importSpecifier),
      knownAbsolutePaths
    );
  }

  return resolvePathAlias(
    importSpecifier,
    importerAbsolutePath,
    rootPath,
    compilerOptions,
    knownAbsolutePaths
  );
}

async function loadCompilerOptions(
  rootPath: string
): Promise<ts.CompilerOptions> {
  const configPath = ts.findConfigFile(
    rootPath,
    ts.sys.fileExists,
    "tsconfig.json"
  );

  if (!configPath) {
    return {};
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  if (configFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(
        configFile.error.messageText,
        "\n"
      )
    );
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    dirname(configPath),
    undefined,
    configPath
  );

  return parsedConfig.options;
}

export async function indexRepository(
  rootPath: string,
  ignoredDirectories: Set<string> = DEFAULT_IGNORED_DIRECTORIES
): Promise<RepositorySnapshot> {
  const absoluteRootPath = resolve(rootPath);
  const files: RepositoryFile[] = [];
  const absoluteSourcePaths: string[] = [];

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
      const extension = extname(entry.name);
      const path = toRepositoryPath(absoluteRootPath, fullPath);

      const file: RepositoryFile = {
        path,
        extension,
        sizeBytes: fileStat.size
      };

      if (SOURCE_EXTENSIONS.has(extension)) {
        const source = await readFile(fullPath, "utf8");
        file.imports = extractImports(source, path);
        absoluteSourcePaths.push(resolve(fullPath));
      }

      files.push(file);
    }
  }

  await walk(absoluteRootPath);

  files.sort((a, b) => a.path.localeCompare(b.path));

  const knownAbsolutePaths = new Map<string, string>();

  for (const file of files) {
    if (!SOURCE_EXTENSIONS.has(file.extension)) {
      continue;
    }

    knownAbsolutePaths.set(
      resolve(absoluteRootPath, file.path),
      file.path
    );
  }

  const compilerOptions = await loadCompilerOptions(absoluteRootPath);

  for (const file of files) {
    if (!file.imports?.length || !SOURCE_EXTENSIONS.has(file.extension)) {
      continue;
    }

    const importerAbsolutePath = resolve(absoluteRootPath, file.path);

    const resolvedImports = file.imports
      .map((specifier) =>
        resolveImportPath(
          specifier,
          importerAbsolutePath,
          absoluteRootPath,
          compilerOptions,
          knownAbsolutePaths
        )
      )
      .filter((path): path is string => Boolean(path))
      .filter((path) => path !== file.path);

    file.resolvedImports = [...new Set(resolvedImports)].sort(
      (a, b) => a.localeCompare(b)
    );
  }

  return {
    rootPath,
    files,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0)
  };
}
