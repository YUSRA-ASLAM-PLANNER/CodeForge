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
    strict_1.default.equal(result.violations.length, 1);
    strict_1.default.equal(result.violations[0].ruleId, "ARCH-001");
});
