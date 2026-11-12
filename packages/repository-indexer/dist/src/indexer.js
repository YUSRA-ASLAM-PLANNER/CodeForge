"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexRepository = indexRepository;
const promises_1 = require("node:fs/promises");
const node_child_process_1 = require("node:child_process");
const node_path_1 = require("node:path");
const ignore_1 = __importDefault(require("ignore"));
const typescript_1 = __importDefault(require("typescript"));
const node_perf_hooks_1 = require("node:perf_hooks");
const DEFAULT_IGNORED_DIRECTORIES = new Set([
    ".git",
    ".codeforge",
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
function extractTypeScriptStructure(source, filePath) {
    const extension = (0, node_path_1.extname)(filePath);
    const scriptKind = extension === ".tsx" ? typescript_1.default.ScriptKind.TSX
        : extension === ".jsx" ? typescript_1.default.ScriptKind.JSX
            : [".js", ".mjs", ".cjs"].includes(extension) ? typescript_1.default.ScriptKind.JS
                : typescript_1.default.ScriptKind.TS;
    const sourceFile = typescript_1.default.createSourceFile(filePath, source, typescript_1.default.ScriptTarget.Latest, true, scriptKind);
    const symbols = new Map();
    const owners = [];
    const bindings = [];
    const imports = new Set();
    function textName(name) {
        if (!name)
            return undefined;
        if (typescript_1.default.isIdentifier(name) || typescript_1.default.isPrivateIdentifier(name) || typescript_1.default.isStringLiteral(name) || typescript_1.default.isNumericLiteral(name))
            return name.text;
        return undefined;
    }
    function addSymbol(name, kind, node) {
        if (!name)
            return;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        symbols.set(`${kind}:${name}`, { name, kind, line });
    }
    function visit(node, className) {
        if ((typescript_1.default.isImportDeclaration(node) || typescript_1.default.isExportDeclaration(node)) &&
            node.moduleSpecifier && typescript_1.default.isStringLiteral(node.moduleSpecifier))
            imports.add(node.moduleSpecifier.text);
        if (typescript_1.default.isCallExpression(node) && node.expression.kind === typescript_1.default.SyntaxKind.ImportKeyword &&
            node.arguments.length === 1 && typescript_1.default.isStringLiteral(node.arguments[0]))
            imports.add(node.arguments[0].text);
        if (typescript_1.default.isImportDeclaration(node) && typescript_1.default.isStringLiteral(node.moduleSpecifier) && node.importClause?.namedBindings) {
            if (typescript_1.default.isNamespaceImport(node.importClause.namedBindings)) {
                bindings.push({ localName: node.importClause.namedBindings.name.text, moduleSpecifier: node.moduleSpecifier.text, namespace: true });
            }
            else {
                for (const element of node.importClause.namedBindings.elements) {
                    bindings.push({
                        localName: element.name.text,
                        importedName: (element.propertyName ?? element.name).text,
                        moduleSpecifier: node.moduleSpecifier.text,
                        namespace: false
                    });
                }
            }
        }
        if (typescript_1.default.isClassDeclaration(node)) {
            const name = textName(node.name);
            if (name) {
                addSymbol(name, "class", node);
                for (const member of node.members) {
                    if (typescript_1.default.isMethodDeclaration(member) || typescript_1.default.isConstructorDeclaration(member)) {
                        const memberName = typescript_1.default.isConstructorDeclaration(member) ? "constructor" : textName(member.name);
                        if (!memberName || !member.body)
                            continue;
                        const qualifiedName = `${name}.${memberName}`;
                        addSymbol(qualifiedName, "method", member);
                        owners.push({ name: qualifiedName, node: member, body: member.body });
                    }
                }
            }
            typescript_1.default.forEachChild(node, (child) => visit(child, name));
            return;
        }
        if (typescript_1.default.isFunctionDeclaration(node)) {
            const name = textName(node.name);
            if (name) {
                addSymbol(name, "function", node);
                if (node.body)
                    owners.push({ name, node, body: node.body });
            }
        }
        else if (typescript_1.default.isInterfaceDeclaration(node)) {
            if (node.name)
                addSymbol(node.name.text, "interface", node);
        }
        else if (typescript_1.default.isTypeAliasDeclaration(node)) {
            addSymbol(node.name.text, "type", node);
        }
        else if (typescript_1.default.isEnumDeclaration(node)) {
            addSymbol(node.name.text, "enum", node);
        }
        else if (typescript_1.default.isVariableDeclaration(node) && typescript_1.default.isIdentifier(node.name)) {
            const initializer = node.initializer;
            if (initializer && (typescript_1.default.isArrowFunction(initializer) || typescript_1.default.isFunctionExpression(initializer))) {
                const name = node.name.text;
                addSymbol(name, "function", node);
                owners.push({ name, node: initializer, body: initializer.body });
            }
            else {
                addSymbol(node.name.text, "variable", node);
            }
        }
        typescript_1.default.forEachChild(node, (child) => visit(child, className));
    }
    visit(sourceFile);
    const calls = new Map();
    for (const owner of owners) {
        function findCalls(node) {
            if (node !== owner.node && (typescript_1.default.isFunctionLike(node) || typescript_1.default.isClassLike(node)))
                return;
            if (typescript_1.default.isCallExpression(node)) {
                let callee;
                let calleeQualifier;
                if (typescript_1.default.isIdentifier(node.expression))
                    callee = node.expression.text;
                else if (typescript_1.default.isPropertyAccessExpression(node.expression) &&
                    (node.expression.expression.kind === typescript_1.default.SyntaxKind.ThisKeyword ||
                        node.expression.expression.kind === typescript_1.default.SyntaxKind.SuperKeyword ||
                        typescript_1.default.isIdentifier(node.expression.expression))) {
                    callee = node.expression.name.text;
                    calleeQualifier = node.expression.expression.getText(sourceFile);
                }
                if (callee) {
                    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
                    const call = {
                        caller: owner.name,
                        callee,
                        ...(calleeQualifier ? { calleeQualifier } : {}),
                        line
                    };
                    calls.set(`${call.caller}:${call.calleeQualifier ?? ""}:${call.callee}:${call.line}`, call);
                }
            }
            typescript_1.default.forEachChild(node, findCalls);
        }
        findCalls(owner.body);
    }
    const compare = (left, right) => left.localeCompare(right);
    return {
        symbols: [...symbols.values()].sort((a, b) => compare(`${a.name}:${a.kind}`, `${b.name}:${b.kind}`)),
        calls: [...calls.values()].sort((a, b) => compare(`${a.caller}:${a.callee}:${a.line}`, `${b.caller}:${b.callee}:${b.line}`)),
        bindings: bindings.sort((a, b) => compare(`${a.moduleSpecifier}:${a.localName}`, `${b.moduleSpecifier}:${b.localName}`)),
        imports: [...imports].sort(compare)
    };
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
function resolveWorkspacePackageImport(importSpecifier, workspacePackages, knownAbsolutePaths) {
    const segments = importSpecifier.split("/");
    const packageName = importSpecifier.startsWith("@")
        ? segments.slice(0, 2).join("/")
        : segments[0];
    const workspacePackage = workspacePackages.get(packageName);
    if (!workspacePackage)
        return undefined;
    const packageSegments = packageName.split("/").length;
    const subpath = segments.slice(packageSegments).join("/");
    const candidates = subpath
        ? [subpath]
        : [
            ...workspacePackage.sourceEntries,
            "src/index",
            "index"
        ];
    for (const entry of candidates) {
        const candidatePath = (0, node_path_1.resolve)(workspacePackage.rootPath, entry);
        const direct = findExistingSourcePath(candidatePath, knownAbsolutePaths);
        if (direct)
            return direct;
        // Workspace package manifests commonly point at compiled `dist` output.
        // Resolve that declaration to the corresponding indexed source entry.
        const normalizedEntry = entry.replace(/\\/g, "/").replace(/^(?:dist|lib|build)\//, "");
        if (normalizedEntry === entry)
            continue;
        const extension = normalizedEntry.endsWith(".d.ts")
            ? ".d.ts"
            : (0, node_path_1.extname)(normalizedEntry);
        const stem = extension ? normalizedEntry.slice(0, -extension.length) : normalizedEntry;
        const sourceExtensions = extension === ".js"
            ? [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx"]
            : extension === ".mjs"
                ? [".mts", ".mjs", ".ts"]
                : extension === ".cjs"
                    ? [".cts", ".cjs", ".ts"]
                    : extension === ".d.ts"
                        ? [".ts", ".tsx"]
                        : [extension];
        for (const sourceExtension of sourceExtensions) {
            const sourcePath = findExistingSourcePath((0, node_path_1.resolve)(workspacePackage.rootPath, `${stem}${sourceExtension}`), knownAbsolutePaths);
            if (sourcePath)
                return sourcePath;
        }
    }
    return undefined;
}
async function loadWorkspacePackages(rootPath, files, withIo) {
    const packages = new Map();
    const manifests = files.filter((file) => file.path === "package.json" || file.path.endsWith("/package.json"));
    for (const file of manifests) {
        let manifest;
        try {
            manifest = JSON.parse(await withIo(() => (0, promises_1.readFile)((0, node_path_1.resolve)(rootPath, file.path), "utf8")));
        }
        catch {
            continue;
        }
        if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest))
            continue;
        const value = manifest;
        if (typeof value.name !== "string" || value.name.trim() === "")
            continue;
        const sourceEntries = [value.source, value.types, value.typings, value.module, value.main]
            .filter((entry) => typeof entry === "string" && entry.length > 0);
        packages.set(value.name, {
            rootPath: (0, node_path_1.resolve)(rootPath, (0, node_path_1.dirname)(file.path)),
            sourceEntries
        });
    }
    return packages;
}
function resolveImportPath(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths, workspacePackages) {
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
    return resolvePathAlias(importSpecifier, importerAbsolutePath, rootPath, compilerOptions, knownAbsolutePaths) ?? resolveWorkspacePackageImport(importSpecifier, workspacePackages, knownAbsolutePaths);
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
async function indexRepository(rootPath, ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES, onTiming, additionalIgnorePatterns = []) {
    const totalStarted = node_perf_hooks_1.performance.now();
    const absoluteRootPath = (0, node_path_1.resolve)(rootPath);
    let configuredIgnoreMatcher;
    if (additionalIgnorePatterns.length > 0) {
        try {
            configuredIgnoreMatcher = (0, ignore_1.default)().add(additionalIgnorePatterns);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid configured repository exclusions: ${message}`);
        }
    }
    const files = [];
    const pythonSources = new Map();
    const analysisWarnings = [];
    let sourceIoCumulativeMs = 0;
    let sourceParseMs = 0;
    let pythonAstMs = 0;
    const maxConcurrentIo = 32;
    let activeIo = 0;
    const ioWaiters = [];
    async function withIo(operation) {
        if (activeIo >= maxConcurrentIo)
            await new Promise((resolveWaiter) => ioWaiters.push(resolveWaiter));
        activeIo += 1;
        try {
            return await operation();
        }
        finally {
            activeIo -= 1;
            ioWaiters.shift()?.();
        }
    }
    async function loadIgnoreScope(directory) {
        const ignorePath = (0, node_path_1.join)(directory, ".gitignore");
        let contents;
        try {
            contents = await withIo(() => (0, promises_1.readFile)(ignorePath, "utf8"));
        }
        catch (error) {
            if (typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "ENOENT") {
                return undefined;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to read ${ignorePath}: ${message}`);
        }
        try {
            return { directory, matcher: (0, ignore_1.default)().add(contents) };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Invalid ignore rules in ${ignorePath}: ${message}`);
        }
    }
    function isIgnored(absolutePath, isDirectory, scopes) {
        let ignored = false;
        for (const scope of scopes) {
            const scopedPath = (0, node_path_1.relative)(scope.directory, absolutePath)
                .replace(/\\/g, "/");
            if (!scopedPath)
                continue;
            const pathname = isDirectory ? `${scopedPath}/` : scopedPath;
            const result = scope.matcher.test(pathname);
            if (result.ignored)
                ignored = true;
            else if (result.unignored)
                ignored = false;
        }
        return ignored;
    }
    async function walk(currentPath, parentScopes = []) {
        const localScope = await loadIgnoreScope(currentPath);
        const scopes = localScope
            ? [...parentScopes, localScope]
            : parentScopes;
        let entries;
        try {
            entries = await withIo(() => (0, promises_1.readdir)(currentPath, { withFileTypes: true }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Unable to read repository directory ${currentPath}: ${message}`);
        }
        async function processEntry(entry) {
            if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
                return;
            }
            const fullPath = (0, node_path_1.join)(currentPath, entry.name);
            if (isIgnored(fullPath, entry.isDirectory(), scopes)) {
                return;
            }
            if (configuredIgnoreMatcher) {
                const configuredPath = (0, node_path_1.relative)(absoluteRootPath, fullPath).replace(/\\/g, "/");
                const pathname = entry.isDirectory() ? `${configuredPath}/` : configuredPath;
                if (configuredIgnoreMatcher.test(pathname).ignored)
                    return;
            }
            if (entry.isDirectory()) {
                await walk(fullPath, scopes);
                return;
            }
            // Symlinks are intentionally not followed, so indexing cannot leave the
            // requested repository root or recurse through a link cycle.
            if (!entry.isFile())
                return;
            const extension = (0, node_path_1.extname)(entry.name);
            const path = toRepositoryPath(absoluteRootPath, fullPath);
            let sizeBytes;
            let source;
            if (SOURCE_EXTENSIONS.has(extension)) {
                let sourceBytes;
                try {
                    sourceBytes = await withIo(async () => {
                        const ioStarted = node_perf_hooks_1.performance.now();
                        const contents = await (0, promises_1.readFile)(fullPath);
                        sourceIoCumulativeMs += node_perf_hooks_1.performance.now() - ioStarted;
                        return contents;
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    throw new Error(`Unable to read repository source ${path}: ${message}`);
                }
                sizeBytes = sourceBytes.length;
                source = sourceBytes.toString("utf8");
            }
            else {
                let fileStat;
                try {
                    fileStat = await withIo(() => (0, promises_1.stat)(fullPath));
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    throw new Error(`Unable to inspect repository file ${fullPath}: ${message}`);
                }
                sizeBytes = fileStat.size;
            }
            const file = { path, extension, sizeBytes };
            if (source !== undefined) {
                const parseStarted = node_perf_hooks_1.performance.now();
                if (extension === ".py" || extension === ".pyi") {
                    file.imports = extractPythonImports(source);
                    pythonSources.set(path, source);
                }
                else {
                    const structure = extractTypeScriptStructure(source, path);
                    file.imports = structure.imports;
                    file.symbols = structure.symbols;
                    file.calls = structure.calls;
                    file.importBindings = structure.bindings;
                }
                sourceParseMs += node_perf_hooks_1.performance.now() - parseStarted;
            }
            files.push(file);
        }
        for (let offset = 0; offset < entries.length; offset += maxConcurrentIo) {
            await Promise.all(entries.slice(offset, offset + maxConcurrentIo).map(processEntry));
        }
    }
    const walkStarted = node_perf_hooks_1.performance.now();
    await walk(absoluteRootPath);
    const walkMs = node_perf_hooks_1.performance.now() - walkStarted;
    files.sort((a, b) => a.path.localeCompare(b.path));
    if (pythonSources.size > 0) {
        const pythonAstStarted = node_perf_hooks_1.performance.now();
        const workerPath = (0, node_path_1.resolve)(__dirname, "../../src/pythonAstWorker.py");
        let parsed;
        for (const executable of ["python", "python3"]) {
            parsed = (0, node_child_process_1.spawnSync)(executable, [workerPath], {
                input: JSON.stringify(Object.fromEntries(pythonSources)),
                encoding: "utf8",
                timeout: 15000,
                maxBuffer: 64 * 1024 * 1024
            });
            if (!parsed.error || parsed.error.code !== "ENOENT")
                break;
        }
        if (!parsed || parsed.error || parsed.status !== 0) {
            const detail = parsed?.error?.message ?? parsed?.stderr?.trim() ?? "Python interpreter is unavailable";
            analysisWarnings.push(`Python symbol analysis was skipped: ${detail}`);
        }
        else {
            try {
                const result = JSON.parse(parsed.stdout);
                for (const file of files) {
                    const output = result[file.path];
                    if (!output)
                        continue;
                    file.symbols = output.symbols;
                    file.calls = output.calls;
                    file.importBindings = output.bindings;
                    if (output.warning)
                        analysisWarnings.push(output.warning);
                }
            }
            catch (error) {
                analysisWarnings.push(`Python symbol analysis returned invalid output: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        pythonAstMs = node_perf_hooks_1.performance.now() - pythonAstStarted;
    }
    const knownAbsolutePaths = new Map();
    for (const file of files) {
        if (!SOURCE_EXTENSIONS.has(file.extension))
            continue;
        knownAbsolutePaths.set((0, node_path_1.resolve)(absoluteRootPath, file.path), file.path);
    }
    const configStarted = node_perf_hooks_1.performance.now();
    const compilerOptions = await loadCompilerOptions(absoluteRootPath);
    const workspacePackages = await loadWorkspacePackages(absoluteRootPath, files, withIo);
    const configMs = node_perf_hooks_1.performance.now() - configStarted;
    const importResolutionStarted = node_perf_hooks_1.performance.now();
    for (const file of files) {
        if (!file.imports?.length || !SOURCE_EXTENSIONS.has(file.extension)) {
            continue;
        }
        const importerAbsolutePath = (0, node_path_1.resolve)(absoluteRootPath, file.path);
        const resolvedImports = file.imports
            .map((specifier) => resolveImportPath(specifier, importerAbsolutePath, absoluteRootPath, compilerOptions, knownAbsolutePaths, workspacePackages))
            .filter((path) => Boolean(path));
        let additionalResolvedImports = [];
        if (file.extension === ".py" || file.extension === ".pyi") {
            const source = await (0, promises_1.readFile)(importerAbsolutePath, "utf8");
            additionalResolvedImports =
                extractPythonImportedModuleCandidates(source)
                    .map((specifier) => resolveImportPath(specifier, importerAbsolutePath, absoluteRootPath, compilerOptions, knownAbsolutePaths, workspacePackages))
                    .filter((path) => Boolean(path));
        }
        file.resolvedImports = [
            ...new Set([
                ...resolvedImports,
                ...additionalResolvedImports
            ])
        ].sort((a, b) => a.localeCompare(b));
    }
    const importResolutionMs = node_perf_hooks_1.performance.now() - importResolutionStarted;
    const callResolutionStarted = node_perf_hooks_1.performance.now();
    const symbolNamesByPath = new Map(files.map((file) => [
        file.path,
        new Set((file.symbols ?? []).map((symbol) => symbol.name))
    ]));
    for (const file of files) {
        const absolutePath = (0, node_path_1.resolve)(absoluteRootPath, file.path);
        const localSymbols = symbolNamesByPath.get(file.path);
        const bindingTargets = new Map();
        for (const binding of file.importBindings ?? []) {
            const moduleCandidates = binding.namespace || !binding.importedName
                ? [binding.moduleSpecifier]
                : [`${binding.moduleSpecifier}${binding.moduleSpecifier.endsWith(".") ? "" : "."}${binding.importedName}`, binding.moduleSpecifier];
            const targetSymbolName = binding.importedName;
            for (const specifier of moduleCandidates) {
                const targetPath = resolveImportPath(specifier, absolutePath, absoluteRootPath, compilerOptions, knownAbsolutePaths, workspacePackages);
                if (!targetPath)
                    continue;
                if (!binding.namespace && !symbolNamesByPath.get(targetPath)?.has(targetSymbolName))
                    continue;
                bindingTargets.set(`${binding.namespace ? "namespace" : "named"}:${binding.localName}`, {
                    path: targetPath,
                    symbolName: binding.namespace ? "" : targetSymbolName ?? ""
                });
                break;
            }
        }
        for (const call of file.calls ?? []) {
            if (call.calleeQualifier === "self" || call.calleeQualifier === "super" || call.calleeQualifier === "this")
                continue;
            if (!call.calleeQualifier && localSymbols.has(call.callee))
                continue;
            const target = call.calleeQualifier
                ? bindingTargets.get(`namespace:${call.calleeQualifier}`)
                : bindingTargets.get(`named:${call.callee}`);
            if (!target)
                continue;
            const targetSymbolName = target.symbolName || call.callee;
            if (!target.symbolName && !symbolNamesByPath.get(target.path)?.has(targetSymbolName))
                continue;
            call.callee = targetSymbolName;
            call.calleePath = target.path;
        }
    }
    const callResolutionMs = node_perf_hooks_1.performance.now() - callResolutionStarted;
    onTiming?.({
        fileCount: files.length,
        walkMs,
        sourceIoCumulativeMs,
        sourceParseMs,
        pythonAstMs,
        configMs,
        importResolutionMs,
        callResolutionMs,
        totalMs: node_perf_hooks_1.performance.now() - totalStarted
    });
    return {
        rootPath,
        files,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0),
        ...(analysisWarnings.length > 0 ? { analysisWarnings } : {})
    };
}
