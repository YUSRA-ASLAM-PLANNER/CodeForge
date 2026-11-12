"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const repositoryVerification_1 = require("../src/repositoryVerification");
(0, node_test_1.default)("verifies a real repository path end-to-end", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "index.ts"), "export const value = 42;\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("applies configured scan exclusions to verification and analysis", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-scan-exclusions-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "generated"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), "export const value = 42;\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "generated", "output.ts"), "export const built = true;\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, ".codeforge.yaml"), "scan:\n  exclude:\n    - generated/\n", "utf8");
    const analysis = await (0, repositoryVerification_1.analyzeRepositoryPath)(root);
    strict_1.default.deepEqual(analysis.snapshot.files.map((file) => file.path), [".codeforge.yaml", "main.ts"]);
    strict_1.default.equal(analysis.result.passed, true);
});
(0, node_test_1.default)("builds import and call edges across npm workspace package names", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-workspace-graph-"));
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
    const analysis = await (0, repositoryVerification_1.analyzeRepositoryPath)(root);
    strict_1.default.ok(analysis.graph.edges.some((edge) => edge.from === "file:packages/app/src/main.ts" &&
        edge.to === "file:packages/library/src/index.ts" &&
        edge.kind === "imports"));
    strict_1.default.ok(analysis.graph.edges.some((edge) => edge.from === "symbol:packages/app/src/main.ts#run" &&
        edge.to === "symbol:packages/library/src/index.ts#helper" &&
        edge.kind === "references"));
});
(0, node_test_1.default)("verifies internal imports through the real repository workflow", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-import-graph-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), 'import { helper } from "./helper";\nexport const result = helper();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "helper.ts"), "export function helper() { return 42; }\n", "utf8");
    const { indexRepository } = await Promise.resolve().then(() => __importStar(require("@codeforge/repository-indexer")));
    const { buildContextGraphFromSnapshot } = await Promise.resolve().then(() => __importStar(require("@codeforge/context-graph")));
    const snapshot = await indexRepository(root);
    const mainFile = snapshot.files.find((file) => file.path === "main.ts");
    strict_1.default.ok(mainFile);
    strict_1.default.deepEqual(mainFile.imports, ["./helper"]);
    const graph = buildContextGraphFromSnapshot(snapshot);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:main.ts" &&
        edge.to === "file:helper.ts" &&
        edge.kind === "imports"));
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("ARCH-023 detects missing internal imports", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-missing-import-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), 'import { helper } from "./missing";\nexport const result = helper();\n', "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, false);
    strict_1.default.ok(result.violations.some((violation) => violation.ruleId === "ARCH-023"), "Expected ARCH-023 to report the unresolved internal import");
});
(0, node_test_1.default)("ARCH-023 resolves an existing .mts module", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-mts-import-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), 'import { helper } from "./helper";\nexport const result = helper();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "helper.mts"), "export function helper() { return 42; }\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("ARCH-023 resolves a directory index.mts module", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-index-mts-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "utils"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "main.ts"), 'import { helper } from "./utils";\nexport const result = helper();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "utils", "index.mts"), "export function helper() { return 42; }\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("ARCH-023 resolves a Python package __init__.py module", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-init-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "utils"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.py"), "from . import utils\nresult = utils.VALUE\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "utils", "__init__.py"), "VALUE = 42\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true, JSON.stringify(result.violations, null, 2));
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("ARCH-023 resolves a Python package __init__.pyi module", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-init-pyi-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "utils"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "main.py"), "from . import utils\nresult = utils.VALUE\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "__init__.py"), "", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "utils", "__init__.pyi"), "VALUE: int\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true, JSON.stringify(result.violations, null, 2));
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("ARCH-024 detects a prohibited UI-to-database import end-to-end", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-arch024-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "ui"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "database"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "ui", "page.ts"), 'import { query } from "../database/query";\nexport const page = query();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "database", "query.ts"), "export function query() { return 42; }\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root, [
        { from: "ui", to: "database" }
    ]);
    strict_1.default.equal(result.passed, false);
    strict_1.default.ok(result.violations.some((violation) => violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")), "Expected ARCH-024 to report the prohibited UI-to-database import");
});
(0, node_test_1.default)("ARCH-025 resolves an alias and detects a prohibited UI-to-database import", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-arch025-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "ui"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "database"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
            baseUrl: ".",
            paths: {
                "@database/*": ["src/database/*"]
            }
        }
    }), "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "ui", "page.ts"), 'import { query } from "@database/query";\nexport const page = query();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "database", "query.ts"), "export function query() { return 42; }\n", "utf8");
    const { indexRepository } = await Promise.resolve().then(() => __importStar(require("@codeforge/repository-indexer")));
    const { buildContextGraphFromSnapshot } = await Promise.resolve().then(() => __importStar(require("@codeforge/context-graph")));
    const snapshot = await indexRepository(root);
    const pageFile = snapshot.files.find((file) => file.path === "src/ui/page.ts");
    strict_1.default.ok(pageFile);
    strict_1.default.deepEqual(pageFile.imports, ["@database/query"]);
    strict_1.default.deepEqual(pageFile.resolvedImports, ["src/database/query.ts"]);
    const graph = buildContextGraphFromSnapshot(snapshot);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/ui/page.ts" &&
        edge.to === "file:src/database/query.ts" &&
        edge.kind === "imports"), "Expected the alias to create an internal import edge");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root, [
        { from: "ui", to: "database" }
    ]);
    strict_1.default.equal(result.passed, false);
    strict_1.default.ok(result.violations.some((violation) => violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")), "Expected ARCH-024 to detect the prohibited alias import");
});
(0, node_test_1.default)("automatically detects a prohibited UI-to-database import", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-auto-arch-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "ui"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "database"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "ui", "page.ts"), 'import { query } from "../database/query";\nexport const page = query();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "database", "query.ts"), "export function query() { return 42; }\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "codeforge.config.json"), JSON.stringify({
        architecture: {
            autoDetectLayers: true
        }
    }), "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, false);
    strict_1.default.ok(result.violations.some((violation) => violation.ruleId === "ARCH-024" &&
        violation.message.includes("ui must not import database")), "Expected automatic architecture detection to report ARCH-024");
});
(0, node_test_1.default)("disables automatically detected boundaries when configured off", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-no-auto-arch-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "ui"), { recursive: true });
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src", "database"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "ui", "page.ts"), 'import { query } from "../database/query";\nexport const page = query();\n', "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "database", "query.ts"), "export function query() { return 42; }\n", "utf8");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "codeforge.config.json"), JSON.stringify({
        architecture: {
            autoDetectLayers: false
        }
    }), "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.violations.some((violation) => violation.ruleId === "ARCH-024"), false, "Automatic boundaries should be disabled");
});
