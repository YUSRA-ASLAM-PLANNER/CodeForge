"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pipeline_1 = require("../src/pipeline");
(0, node_test_1.default)("repository verification pipeline detects graph violations", () => {
    const result = (0, pipeline_1.verifyRepository)({
        rootPath: ".",
        files: [
            {
                path: "src/index.ts",
                extension: ".ts",
                sizeBytes: 100
            }
        ],
        fileCount: 1,
        totalBytes: 100
    }, {
        nodes: [
            {
                id: "repository:root",
                kind: "repository",
                label: "CodeForge"
            },
            {
                id: "file:src/index.ts",
                kind: "file",
                label: "src/index.ts",
                path: "src/index.ts"
            }
        ],
        edges: [
            {
                from: "file:src/index.ts",
                to: "file:missing.ts",
                kind: "imports"
            }
        ]
    });
    strict_1.default.equal(result.passed, false);
    strict_1.default.equal(result.violations.length, 2);
    strict_1.default.equal(result.violations[0].ruleId, "ARCH-001");
});
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const repository_indexer_1 = require("@codeforge/repository-indexer");
const context_graph_1 = require("@codeforge/context-graph");
(0, node_test_1.default)("pipeline detects circular dependencies between indexed Python files", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-python-cycle-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src"), { recursive: true });
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "a.py"), "from src.b import helper\n");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "b.py"), "from src.a import helper\n");
    const snapshot = await (0, repository_indexer_1.indexRepository)(root);
    const graph = (0, context_graph_1.buildContextGraphFromSnapshot)(snapshot);
    const result = (0, pipeline_1.verifyRepository)(snapshot, graph);
    strict_1.default.ok(result.violations.some((violation) => violation.ruleId === "ARCH-026"), "Expected ARCH-026 to detect the Python circular dependency");
});
