"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const indexer_1 = require("../src/indexer");
(0, node_test_1.default)("indexes repository files deterministically", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-indexer-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "node_modules"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, ".codeforge"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "README.md"), "# CodeForge");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "index.ts"), "export const x = 1;");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "node_modules", "ignored.js"), "ignored");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, ".codeforge", "findings.wal.jsonl"), "ignored");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.equal(snapshot.fileCount, 2);
    strict_1.default.deepEqual(snapshot.files.map((file) => file.path), ["README.md", "src/index.ts"]);
    strict_1.default.equal(snapshot.files[0].extension, ".md");
    strict_1.default.equal(snapshot.files[1].extension, ".ts");
});
(0, node_test_1.default)("returns files in sorted path order", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-indexer-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "z.ts"), "z");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "a.ts"), "a");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "m.ts"), "m");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.deepEqual(snapshot.files.map((file) => file.path), ["a.ts", "m.ts", "z.ts"]);
});
(0, node_test_1.default)("reports source file sizes in encoded bytes", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-source-size-"));
    const source = "export const café = 'naïve';\n";
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "unicode.ts"), source, "utf8");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.equal(snapshot.files[0].sizeBytes, Buffer.byteLength(source, "utf8"));
});
(0, node_test_1.default)("extracts TypeScript declarations and in-file call relationships from the AST", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-symbols-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "service.ts"), [
        "export interface User { id: string }",
        "export type UserId = string;",
        "export enum State { Ready }",
        "export function helper() { return 1; }",
        "export class Service { run() { return helper(); } }",
        "export const load = () => helper();"
    ].join("\n"));
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const file = snapshot.files[0];
    strict_1.default.deepEqual(file.symbols?.map((symbol) => `${symbol.kind}:${symbol.name}`).sort(), [
        "class:Service",
        "enum:State",
        "function:helper",
        "function:load",
        "interface:User",
        "method:Service.run",
        "type:UserId"
    ].sort());
    strict_1.default.ok(file.calls?.some((call) => call.caller === "Service.run" && call.callee === "helper"));
    strict_1.default.ok(file.calls?.some((call) => call.caller === "load" && call.callee === "helper"));
});
(0, node_test_1.default)("resolves TypeScript calls through imported declarations across files", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-call-graph-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.ts"), "import { helper } from './helper';\nexport function run() { return helper(); }\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "helper.ts"), "export function helper() { return 1; }\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const main = snapshot.files.find((file) => file.path === "src/main.ts");
    strict_1.default.ok(main?.calls?.some((call) => call.caller === "run" && call.callee === "helper" && call.calleePath === "src/helper.ts"));
});
(0, node_test_1.default)("extracts Python AST symbols and resolves imported function calls", async (t) => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-symbols-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.py"), [
        "from helpers import calculate as compute",
        "class Service:",
        "    def run(self):",
        "        return compute()"
    ].join("\n"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "helpers.py"), "def calculate():\n    return 42\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    if (snapshot.analysisWarnings?.some((warning) => warning.includes("Python symbol analysis was skipped"))) {
        t.skip("A Python interpreter is needed for stdlib AST analysis.");
        return;
    }
    const main = snapshot.files.find((file) => file.path === "main.py");
    const helper = snapshot.files.find((file) => file.path === "helpers.py");
    strict_1.default.ok(main?.symbols?.some((symbol) => symbol.kind === "class" && symbol.name === "Service"));
    strict_1.default.ok(main?.symbols?.some((symbol) => symbol.kind === "method" && symbol.name === "Service.run"));
    strict_1.default.ok(helper?.symbols?.some((symbol) => symbol.kind === "function" && symbol.name === "calculate"));
    strict_1.default.ok(main?.calls?.some((call) => call.caller === "Service.run" && call.callee === "calculate" && call.calleePath === "helpers.py"));
});
(0, node_test_1.default)("reports Python syntax failures as analysis warnings without aborting indexing", async (t) => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-syntax-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "broken.py"), "def broken(:\n    pass\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    if (snapshot.analysisWarnings?.some((warning) => warning.includes("Python symbol analysis was skipped"))) {
        t.skip("A Python interpreter is needed for stdlib AST analysis.");
        return;
    }
    strict_1.default.equal(snapshot.fileCount, 1);
    strict_1.default.ok(snapshot.analysisWarnings?.some((warning) => warning.includes("broken.py")));
});
(0, node_test_1.default)("respects root .gitignore rules and negated patterns", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-gitignore-root-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "coverage"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, ".gitignore"), "*.log\n!important.log\ncoverage/\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "debug.log"), "ignored");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "important.log"), "included by negation");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "coverage", "report.txt"), "ignored directory");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), "export {};\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const indexedPaths = snapshot.files.map((file) => file.path);
    strict_1.default.ok(indexedPaths.includes("important.log"));
    strict_1.default.ok(indexedPaths.includes("main.ts"));
    strict_1.default.ok(!indexedPaths.includes("debug.log"));
    strict_1.default.ok(!indexedPaths.includes("coverage/report.txt"));
});
(0, node_test_1.default)("applies nested .gitignore rules within their directory", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-gitignore-nested-"));
    const sourceDirectory = (0, node_path_1.join)(root, "src");
    await (0, promises_1.mkdir)(sourceDirectory);
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, ".gitignore"), "src/**/*.generated.ts\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(sourceDirectory, ".gitignore"), "!keep.generated.ts\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "root.generated.ts"), "root file");
    await (0, promises_1.writeFile)((0, node_path_1.join)(sourceDirectory, "ignored.generated.ts"), "ignored");
    await (0, promises_1.writeFile)((0, node_path_1.join)(sourceDirectory, "keep.generated.ts"), "re-included");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const indexedPaths = snapshot.files.map((file) => file.path);
    strict_1.default.ok(indexedPaths.includes("root.generated.ts"));
    strict_1.default.ok(indexedPaths.includes("src/keep.generated.ts"));
    strict_1.default.ok(!indexedPaths.includes("src/ignored.generated.ts"));
});
(0, node_test_1.default)("detects static, re-export, and dynamic imports", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-imports-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), [
        'import { helper } from "./helper";',
        'export { value } from "./values";',
        'const lazy = import("./lazy");',
        "const result = helper;"
    ].join("\n"));
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "main.ts");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, [
        "./helper",
        "./lazy",
        "./values"
    ]);
});
(0, node_test_1.default)("preserves TypeScript path alias import specifiers", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-alias-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "database"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            baseUrl: ".",
            paths: {
                "@database/*": ["src/database/*"]
            }
        }
    }));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "database", "query.ts"), "export const query = () => true;");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "index.ts"), 'import { query } from "@database/query";\nexport { query };');
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const indexFile = snapshot.files.find((file) => file.path === "src/index.ts");
    strict_1.default.ok(indexFile);
    strict_1.default.deepEqual(indexFile.imports, ["@database/query"]);
    strict_1.default.deepEqual(indexFile.resolvedImports, ["src/database/query.ts"]);
});
(0, node_test_1.default)("continues to detect relative imports alongside aliases", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-mixed-imports-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), [
        'import { helper } from "./helper";',
        'import { query } from "@database/query";'
    ].join("\n"));
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "main.ts");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, [
        "./helper",
        "@database/query"
    ]);
});
(0, node_test_1.default)("resolves imports to source entries of npm workspace packages", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-workspace-imports-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "packages", "library", "src"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "packages", "app", "src"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "package.json"), JSON.stringify({
        name: "workspace-root",
        workspaces: ["packages/*"]
    }));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "packages", "library", "package.json"), JSON.stringify({
        name: "@example/library",
        main: "dist/src/index.js",
        types: "dist/src/index.d.ts"
    }));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "packages", "app", "package.json"), JSON.stringify({
        name: "@example/app"
    }));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "packages", "library", "src", "index.ts"), "export function helper() { return 42; }\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "packages", "app", "src", "main.ts"), 'import { helper } from "@example/library";\nexport function run() { return helper(); }\n');
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const app = snapshot.files.find((file) => file.path === "packages/app/src/main.ts");
    strict_1.default.ok(app);
    strict_1.default.deepEqual(app.resolvedImports, ["packages/library/src/index.ts"]);
    strict_1.default.ok(app.calls?.some((call) => call.callee === "helper" && call.calleePath === "packages/library/src/index.ts"), JSON.stringify(app));
});
(0, node_test_1.default)("indexes Python files and extracts import statements", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.py"), "import os\nfrom src.helper import calculate\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "helper.py"), "def calculate():\n    return 1\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "src/main.py");
    strict_1.default.ok(mainFile);
    strict_1.default.equal(mainFile.extension, ".py");
    strict_1.default.deepEqual(mainFile.imports, [
        "os",
        "src.helper"
    ]);
    strict_1.default.deepEqual(mainFile.resolvedImports, [
        "src/helper.py"
    ]);
});
(0, node_test_1.default)("resolves relative Python package imports", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-relative-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "services"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "main.py"), "from . import helper\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "helper.py"), "def run():\n    return 1\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "src/services/main.py");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, [".", ".helper"]);
    strict_1.default.deepEqual(mainFile.resolvedImports, [
        "src/services/__init__.py",
        "src/services/helper.py"
    ]);
});
(0, node_test_1.default)("resolves Python imports from a parent package", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-parent-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "services"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "shared"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "shared", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "main.py"), "from ..shared import utils\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "shared", "utils.py"), "def run():\n    return 1\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "src/services/main.py");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, ["..shared", "..shared.utils"]);
    strict_1.default.deepEqual(mainFile.resolvedImports, [
        "src/shared/__init__.py",
        "src/shared/utils.py"
    ]);
});
(0, node_test_1.default)("indexes Python stub files", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-stubs-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "helper.pyi"), "def calculate() -> int: ...\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.ok(snapshot.files.some((file) => file.path === "helper.pyi"));
});
(0, node_test_1.default)("preserves Python self-imports in resolved imports", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-self-import-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.py"), "import main\n");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "main.py");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, ["main"]);
    strict_1.default.deepEqual(mainFile.resolvedImports, ["main.py"]);
});
(0, node_test_1.default)("extracts multiline Python imports", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-multiline-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "services"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "helper.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "utils.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.py"), [
        "from src.services import (",
        "    helper,",
        "    utils,",
        ")"
    ].join("\n"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "message.py"), 'message = "Issue #123"\n');
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "src/main.py");
    const messageFile = snapshot.files.find((file) => file.path === "src/message.py");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, ["src.services"]);
    strict_1.default.deepEqual(mainFile.resolvedImports, [
        "src/services/__init__.py",
        "src/services/helper.py",
        "src/services/utils.py"
    ]);
    strict_1.default.ok(messageFile);
    strict_1.default.deepEqual(messageFile.imports, []);
});
(0, node_test_1.default)("resolves individual modules imported from a Python package", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-package-members-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "services"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "__init__.py"), "");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "helper.py"), "def calculate():\n    return 1\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "services", "utils.py"), "def format_value():\n    return 'ok'\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.py"), [
        "from src.services import (",
        "    helper,",
        "    utils,",
        ")"
    ].join("\n"));
    const snapshot = await (0, indexer_1.indexRepository)(root);
    const mainFile = snapshot.files.find((file) => file.path === "src/main.py");
    strict_1.default.ok(mainFile);
    const resolvedImports = mainFile.resolvedImports ?? [];
    strict_1.default.ok(resolvedImports.includes("src/services/helper.py"), "expected helper.py to be resolved");
    strict_1.default.ok(resolvedImports.includes("src/services/utils.py"), "expected utils.py to be resolved");
});
