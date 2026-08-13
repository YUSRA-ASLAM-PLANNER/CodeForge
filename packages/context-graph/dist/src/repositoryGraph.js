"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextGraph = buildContextGraph;
exports.buildContextGraphFromSnapshot = buildContextGraphFromSnapshot;
const builder_1 = require("./builder");
function buildContextGraph(files) {
    const graph = new builder_1.ContextGraphBuilder();
    graph.addNode("repository:root", "repository", "CodeForge");
    for (const file of files) {
        const id = `file:${file.path}`;
        graph.addNode(id, "file", file.path, file.path);
        graph.addEdge("repository:root", id, "contains");
    }
    return graph.build();
}
function buildContextGraphFromSnapshot(snapshot) {
    return buildContextGraph(snapshot.files);
}
