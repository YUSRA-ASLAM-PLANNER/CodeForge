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
    "dist-tests",
    "__pycache__",
    ".venv",
    "venv"
]);
const SOURCE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mts",
    ".cts",
    ".mjs",
    ".cjs",
    ".py",
    ".pyi"
]);
const TYPESCRIPT_EXTENSIONS = [
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
const PYTHON_EXTENSIONS = [".py", ".pyi"];
const RESOLVABLE_EXTENSIONS = [
    ...TYPESCRIPT_EXTENSIONS,
    ...PYTHON_EXTENSIONS
];
function extractTypeScriptImports(source, filePath) {
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
function stripPythonComments(source) {
    let result = "";
    let quote = null;
    let tripleQuoted = false;
    let escaped = false;
    let inComment = false;
    for (let i = 0; i < source.length; i++) {
        const char = source[i];
        const nextThree = source.slice(i, i + 3);
        if (inComment) {
            if (char === "\n") {
                result += char;
                inComment = false;
            }
            continue;
        }
        if (quote !== null) {
            if (escaped) {
                result += char;
                escaped = false;
                continue;
            }
            if (char === "\\") {
                result += char;
                escaped = true;
                continue;
            }
            if (tripleQuoted && nextThree === quote.repeat(3)) {
                result += nextThree;
                i += 2;
                quote = null;
                tripleQuoted = false;
                continue;
            }
            if (!tripleQuoted && char === quote) {
                result += char;
                quote = null;
                continue;
            }
            result += char;
            continue;
        }
        if (char === "#") {
            inComment = true;
            continue;
        }
        if (nextThree === "'''" || nextThree === '"""') {
            quote = char;
            tripleQuoted = true;
            result += nextThree;
            i += 2;
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            tripleQuoted = false;
            result += char;
            continue;
        }
        result += char;
    }
    return result;
}
function normalizePythonImports(source) {
    return stripPythonComments(source)
        .replace(/\\\r?\n/g, "")
        .replace(/(\bfrom\s+[.\w]+\s+import\s*)\(\s*([\s\S]*?)\s*\)/g, (_match, prefix, importedNames) => `${prefix}${importedNames.replace(/\r?\n/g, " ")}`);
}
function extractPythonImports(source) {
    const imports = new Set();
    const normalizedSource = normalizePythonImports(source);
    const importPattern = /^\s*import\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\s*,\s*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)*)/gm;
    const fromImportPattern = /^\s*from\s+([.]*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*|\.{1,})\s+import\s+(.+)$/gm;
    for (const match of normalizedSource.matchAll(importPattern)) {
        const names = match[1]
            .split(",")
            .map((name) => name.trim().split(/\s+as\s+/)[0]);
        for (const name of names) {
            if (name)
                imports.add(name);
        }
    }
    for (const match of normalizedSource.matchAll(fromImportPattern)) {
        const moduleName = match[1];
        const importedNames = match[2];
        imports.add(moduleName);
        if (moduleName.startsWith(".")) {
            for (const item of importedNames.split(",")) {
                const name = item.trim().split(/\s+as\s+/)[0];
                if (name && /^[A-Za-z_]\w*$/.test(name)) {
                    imports.add(/^\.+$/.test(moduleName)
                        ? `${moduleName}${name}`
                        : `${moduleName}.${name}`);
                }
            }
        }
    }
    return [...imports].sort((a, b) => a.localeCompare(b));
}
/**
 * Finds individual Python submodules imported using a single-line
 * absolute import, without adding them to RepositoryFile.imports.
 *
 * Example:
 * from src.services import helper, utils
 *
 * Parenthesized multiline imports are excluded because the indexer
 * treats those as package-level imports for its existing behavior.
 */
function extractPythonImportedModuleCandidates(source) {
    const candidates = new Set();
    const normalizedSource = normalizePythonImports(source);
    const fromImportPattern = /^\s*from\s+([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\s+import\s+(.+)$/gm;
    for (const match of normalizedSource.matchAll(fromImportPattern)) {
        const moduleName = match[1];
        const importedNames = match[2];
        for (const item of importedNames.split(",")) {
            const name = item.trim().split(/\s+as\s+/)[0];
            if (name && /^[A-Za-z_]\w*$/.test(name)) {
                candidates.add(`${moduleName}.${name}`);
            }
        }
    }
    return [...candidates].sort((a, b) => a.localeCompare(b));
}
function extractImports(source, filePath) {
    const extension = (0, node_path_1.extname)(filePath);
    if (extension === ".py" || extension === ".pyi") {
        return extractPythonImports(source);
    }
    return extractTypeScriptImports(source, filePath);
}
function toRepositoryPath(rootPath, absolutePath) {
    return (0, node_path_1.relative)(rootPath, absolutePath).replace(/\\/g, "/");
}
function findExistingSourcePath(candidatePath, knownAbsolutePaths) {
    const normalizedCandidate = (0, node_path_1.resolve)(candidatePath);
    const candidates = [
        normalizedCandidate,
        ...RESOLVABLE_EXTENSIONS.map((extension) => `${normalizedCandidate}${extension}`),
        ...RESOLVABLE_EXTENSIONS.map((extension) => (0, node_path_1.join)(normalizedCandidate, `index${extension}`)),
        ...PYTHON_EXTENSIONS.map((extension) => (0, node_path_1.join)(normalizedCandidate, `__init__${extension}`))
    ];
    for (const candidate of candidates) {
        const repositoryPath = knownAbsolutePaths.get((0, node_path_1.resolve)(candidate));
        if (repositoryPath)
            return repositoryPath;
    }
    return undefined;
}
function resolvePathAlias(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths) {
    const paths = compilerOptions.paths;
    if (!paths)
        return undefined;
    const baseUrl = compilerOptions.baseUrl
        ? (0, node_path_1.resolve)(rootPath, compilerOptions.baseUrl)
        : rootPath;
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
            importSpecifier.length >=
                entry.prefix.length + entry.suffix.length
        : importSpecifier === entry.pattern)
        .sort((a, b) => b.prefix.length - a.prefix.length);
    for (const entry of matchingPatterns) {
        const matchedText = entry.wildcard
            ? importSpecifier.slice(entry.prefix.length, importSpecifier.length - entry.suffix.length)
            : "";
        for (const target of paths[entry.pattern] ?? []) {
            const candidatePath = (0, node_path_1.resolve)(baseUrl, target.replace("*", matchedText));
            const resolved = findExistingSourcePath(candidatePath, knownAbsolutePaths);
            if (resolved)
                return resolved;
        }
    }
    void importerAbsolutePath;
    return undefined;
}
function resolveImportPath(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths) {
    const importerExtension = (0, node_path_1.extname)(importerAbsolutePath);
    if (importerExtension === ".py" || importerExtension === ".pyi") {
        const importerDirectory = (0, node_path_1.dirname)(importerAbsolutePath);
        if (importSpecifier.startsWith(".")) {
            let dots = 0;
            while (importSpecifier[dots] === ".") {
                dots++;
            }
            let targetDirectory = importerDirectory;
            for (let i = 1; i < dots; i++) {
                targetDirectory = (0, node_path_1.dirname)(targetDirectory);
            }
            const moduleName = importSpecifier.slice(dots);
            const modulePath = moduleName
                ? (0, node_path_1.join)(targetDirectory, ...moduleName.split("."))
                : targetDirectory;
            return findExistingSourcePath(modulePath, knownAbsolutePaths);
        }
        const modulePath = (0, node_path_1.resolve)(rootPath, ...importSpecifier.split("."));
        return findExistingSourcePath(modulePath, knownAbsolutePaths);
    }
    if (importSpecifier.startsWith(".")) {
        return findExistingSourcePath((0, node_path_1.resolve)((0, node_path_1.dirname)(importerAbsolutePath), importSpecifier), knownAbsolutePaths);
    }
    return resolvePathAlias(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths);
}
async function loadCompilerOptions(rootPath) {
    const configPath = typescript_1.default.findConfigFile(rootPath, typescript_1.default.sys.fileExists, "tsconfig.json");
    if (!configPath)
        return {};
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
            if (!entry.isFile())
                continue;
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
            }
            files.push(file);
        }
    }
    await walk(absoluteRootPath);
    files.sort((a, b) => a.path.localeCompare(b.path));
    const knownAbsolutePaths = new Map();
    for (const file of files) {
        if (!SOURCE_EXTENSIONS.has(file.extension))
            continue;
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
            .filter((path) => Boolean(path));
        let additionalResolvedImports = [];
        if (file.extension === ".py" || file.extension === ".pyi") {
            const source = await (0, promises_1.readFile)(importerAbsolutePath, "utf8");
            additionalResolvedImports =
                extractPythonImportedModuleCandidates(source)
                    .map((specifier) => resolveImportPath(specifier, importerAbsolutePath, absoluteRootPath, compilerOptions, knownAbsolutePaths))
                    .filter((path) => Boolean(path));
        }
        file.resolvedImports = [
            ...new Set([
                ...resolvedImports,
                ...additionalResolvedImports
            ])
        ].sort((a, b) => a.localeCompare(b));
    }
    return {
        rootPath,
        files,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0)
    };
}
