"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const repositoryGraph_1 = require("../src/repositoryGraph");
(0, node_test_1.default)("builds a graph from indexed repository files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        { path: "src/index.ts" },
        { path: "src/app.ts" }
    ]);
    strict_1.default.equal(graph.nodes.length, 4);
    strict_1.default.equal(graph.edges.length, 3);
    strict_1.default.deepEqual(graph.nodes.map((node) => node.id), [
        "directory:src",
        "file:src/app.ts",
        "file:src/index.ts",
        "repository:root"
    ]);
});
(0, node_test_1.default)("creates import edges between internal repository files", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/main.ts",
            imports: ["./helper", "express"]
        },
        {
            path: "src/helper.ts",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/main.ts" &&
        edge.to === "file:src/helper.ts" &&
        edge.kind === "imports"));
    strict_1.default.ok(!graph.edges.some((edge) => edge.from === "file:src/main.ts" &&
        edge.to.includes("express") &&
        edge.kind === "imports"));
});
(0, node_test_1.default)("creates import edges from resolved alias paths", () => {
    const graph = (0, repositoryGraph_1.buildContextGraph)([
        {
            path: "src/index.ts",
            imports: ["@database/query"],
            resolvedImports: ["src/database/query.ts"]
        },
        {
            path: "src/database/query.ts",
            imports: []
        }
    ]);
    strict_1.default.ok(graph.edges.some((edge) => edge.from === "file:src/index.ts" &&
        edge.to === "file:src/database/query.ts" &&
        edge.kind === "imports"));
});
