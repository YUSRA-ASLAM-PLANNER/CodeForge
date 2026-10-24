"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexRepository = indexRepository;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const typescript_1 = __importDefault(require("typescript"));
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
function extractImports(source, filePath) {
    const extension = (0, node_path_1.extname)(filePath);
    const scriptKind = extension === ".tsx" ? typescript_1.default.ScriptKind.TSX :
        extension === ".jsx" ? typescript_1.default.ScriptKind.JSX :
            [".js", ".mjs", ".cjs"].includes(extension)
                ? typescript_1.default.ScriptKind.JS
                : typescript_1.default.ScriptKind.TS;
    const sourceFile = typescript_1.default.createSourceFile(filePath, source, typescript_1.default.ScriptTarget.Latest, true, scriptKind);
    const imports = new Set();
    function visit(node) {
        if ((typescript_1.default.isImportDeclaration(node) ||
            typescript_1.default.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            typescript_1.default.isStringLiteral(node.moduleSpecifier)) {
            imports.add(node.moduleSpecifier.text);
        }
        if (typescript_1.default.isCallExpression(node) &&
            node.expression.kind === typescript_1.default.SyntaxKind.ImportKeyword &&
            node.arguments.length === 1 &&
            typescript_1.default.isStringLiteral(node.arguments[0])) {
            imports.add(node.arguments[0].text);
        }
        typescript_1.default.forEachChild(node, visit);
    }
    visit(sourceFile);
    return [...imports].sort((a, b) => a.localeCompare(b));
}
function toRepositoryPath(rootPath, absolutePath) {
    return (0, node_path_1.relative)(rootPath, absolutePath).replace(/\\/g, "/");
}
function findExistingSourcePath(candidatePath, knownAbsolutePaths) {
    const normalizedCandidate = (0, node_path_1.resolve)(candidatePath);
    const candidates = [
        normalizedCandidate,
        ...RESOLVABLE_EXTENSIONS.map((extension) => `${normalizedCandidate}${extension}`),
        ...RESOLVABLE_EXTENSIONS.map((extension) => (0, node_path_1.join)(normalizedCandidate, `index${extension}`))
    ];
    for (const candidate of candidates) {
        const repositoryPath = knownAbsolutePaths.get((0, node_path_1.resolve)(candidate));
        if (repositoryPath) {
            return repositoryPath;
        }
    }
    return undefined;
}
function resolvePathAlias(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths) {
    const configDirectory = rootPath;
    const paths = compilerOptions.paths;
    if (!paths) {
        return undefined;
    }
    const baseUrl = compilerOptions.baseUrl
        ? (0, node_path_1.resolve)(configDirectory, compilerOptions.baseUrl)
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
        .filter((entry) => entry.wildcard
        ? importSpecifier.startsWith(entry.prefix) &&
            importSpecifier.endsWith(entry.suffix) &&
            importSpecifier.length >= entry.prefix.length + entry.suffix.length
        : importSpecifier === entry.pattern)
        .sort((a, b) => b.prefix.length - a.prefix.length);
    for (const entry of matchingPatterns) {
        const matchedText = entry.wildcard
            ? importSpecifier.slice(entry.prefix.length, importSpecifier.length - entry.suffix.length)
            : "";
        for (const target of paths[entry.pattern] ?? []) {
            const substitutedTarget = target.replace("*", matchedText);
            const targetBase = compilerOptions.baseUrl
                ? baseUrl
                : (0, node_path_1.dirname)((0, node_path_1.join)(rootPath, "tsconfig.json"));
            const candidatePath = (0, node_path_1.resolve)(targetBase, substitutedTarget);
            const resolved = findExistingSourcePath(candidatePath, knownAbsolutePaths);
            if (resolved) {
                return resolved;
            }
        }
    }
    // Keep the parameter available for future support of tsconfig inheritance.
    void importerAbsolutePath;
    return undefined;
}
function resolveImportPath(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths) {
    if (importSpecifier.startsWith(".")) {
        return findExistingSourcePath((0, node_path_1.resolve)((0, node_path_1.dirname)(importerAbsolutePath), importSpecifier), knownAbsolutePaths);
    }
    return resolvePathAlias(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths);
}
async function loadCompilerOptions(rootPath) {
    const configPath = typescript_1.default.findConfigFile(rootPath, typescript_1.default.sys.fileExists, "tsconfig.json");
    if (!configPath) {
        return {};
    }
    const configFile = typescript_1.default.readConfigFile(configPath, typescript_1.default.sys.readFile);
    if (configFile.error) {
        throw new Error(typescript_1.default.flattenDiagnosticMessageText(configFile.error.messageText, "\n"));
    }
    const parsedConfig = typescript_1.default.parseJsonConfigFileContent(configFile.config, typescript_1.default.sys, (0, node_path_1.dirname)(configPath), undefined, configPath);
    return parsedConfig.options;
}
async function indexRepository(rootPath, ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES) {
    const absoluteRootPath = (0, node_path_1.resolve)(rootPath);
    const files = [];
    const absoluteSourcePaths = [];
    async function walk(currentPath) {
        const entries = await (0, promises_1.readdir)(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
                continue;
            }
            const fullPath = (0, node_path_1.join)(currentPath, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const fileStat = await (0, promises_1.stat)(fullPath);
            const extension = (0, node_path_1.extname)(entry.name);
            const path = toRepositoryPath(absoluteRootPath, fullPath);
            const file = {
                path,
                extension,
                sizeBytes: fileStat.size
            };
            if (SOURCE_EXTENSIONS.has(extension)) {
                const source = await (0, promises_1.readFile)(fullPath, "utf8");
                file.imports = extractImports(source, path);
                absoluteSourcePaths.push((0, node_path_1.resolve)(fullPath));
            }
            files.push(file);
        }
    }
    await walk(absoluteRootPath);
    files.sort((a, b) => a.path.localeCompare(b.path));
    const knownAbsolutePaths = new Map();
    for (const file of files) {
        if (!SOURCE_EXTENSIONS.has(file.extension)) {
            continue;
        }
        knownAbsolutePaths.set((0, node_path_1.resolve)(absoluteRootPath, file.path), file.path);
    }
    const compilerOptions = await loadCompilerOptions(absoluteRootPath);
    for (const file of files) {
        if (!file.imports?.length || !SOURCE_EXTENSIONS.has(file.extension)) {
            continue;
        }
        const importerAbsolutePath = (0, node_path_1.resolve)(absoluteRootPath, file.path);
        const resolvedImports = file.imports
            .map((specifier) => resolveImportPath(specifier, importerAbsolutePath, absoluteRootPath, compilerOptions, knownAbsolutePaths))
            .filter((path) => Boolean(path))
            .filter((path) => path !== file.path);
        file.resolvedImports = [...new Set(resolvedImports)].sort((a, b) => a.localeCompare(b));
    }
    return {
        rootPath,
        files,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0)
    };
}
