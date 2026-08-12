"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRepositoryPath = verifyRepositoryPath;
const repository_indexer_1 = require("@codeforge/repository-indexer");
const context_graph_1 = require("@codeforge/context-graph");
const pipeline_1 = require("./pipeline");
async function verifyRepositoryPath(rootPath) {
    const snapshot = await (0, repository_indexer_1.indexRepository)(rootPath);
    const graph = (0, context_graph_1.buildContextGraphFromSnapshot)(snapshot);
    return (0, pipeline_1.verifyRepository)(snapshot, graph);
}
