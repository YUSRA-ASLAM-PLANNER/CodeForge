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
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "README.md"), "# CodeForge");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "index.ts"), "export const x = 1;");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "node_modules", "ignored.js"), "ignored");
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
