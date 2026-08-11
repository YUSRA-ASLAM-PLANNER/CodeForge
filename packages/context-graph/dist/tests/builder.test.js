"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const builder_1 = require("../src/builder");
(0, node_test_1.default)("builds a deterministic context graph", () => {
    const graph = new builder_1.ContextGraphBuilder();
    graph.addNode("file:b.ts", "file", "b.ts", "src/b.ts");
    graph.addNode("repo", "repository", "CodeForge");
    graph.addNode("file:a.ts", "file", "a.ts", "src/a.ts");
    graph.addEdge("repo", "file:b.ts", "contains");
    graph.addEdge("repo", "file:a.ts", "contains");
    const result = graph.build();
    strict_1.default.deepEqual(result.nodes.map((node) => node.id), ["file:a.ts", "file:b.ts", "repo"]);
    strict_1.default.equal(result.edges.length, 2);
});
(0, node_test_1.default)("deduplicates nodes and edges", () => {
    const graph = new builder_1.ContextGraphBuilder();
    const firstNode = graph.addNode("file:a.ts", "file", "a.ts", "src/a.ts");
    const secondNode = graph.addNode("file:a.ts", "file", "different-label", "different/path.ts");
    strict_1.default.equal(firstNode, secondNode);
    graph.addNode("repo", "repository", "CodeForge");
    const firstEdge = graph.addEdge("repo", "file:a.ts", "contains");
    const secondEdge = graph.addEdge("repo", "file:a.ts", "contains");
    strict_1.default.equal(firstEdge, secondEdge);
    strict_1.default.equal(graph.build().edges.length, 1);
});
(0, node_test_1.default)("rejects edges with missing nodes", () => {
    const graph = new builder_1.ContextGraphBuilder();
    graph.addNode("repo", "repository", "CodeForge");
    strict_1.default.throws(() => graph.addEdge("repo", "missing", "contains"), /Target node does not exist/);
});
