"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const repositoryGraph_1 = require("../src/repositoryGraph");
(0, node_test_1.default)("builds context graph from repository snapshot", () => {
    const graph = (0, repositoryGraph_1.buildContextGraphFromSnapshot)({
        rootPath: "C:/project",
        files: [
            {
                path: "src/app.ts",
                extension: ".ts",
                sizeBytes: 100
            },
            {
                path: "src/index.ts",
                extension: ".ts",
                sizeBytes: 200
            }
        ],
        fileCount: 2,
        totalBytes: 300
    });
    strict_1.default.equal(graph.nodes.length, 4);
    strict_1.default.equal(graph.edges.length, 3);
    strict_1.default.deepEqual(graph.nodes.map((node) => node.id), [
        "directory:src",
        "file:src/app.ts",
        "file:src/index.ts",
        "repository:root"
    ]);
});
