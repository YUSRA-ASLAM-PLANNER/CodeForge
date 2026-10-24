"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRepositoryPath = verifyRepositoryPath;
const repository_indexer_1 = require("@codeforge/repository-indexer");
const context_graph_1 = require("@codeforge/context-graph");
const pipeline_1 = require("./pipeline");
const config_1 = require("./config");
const architecture_1 = require("./architecture");
async function verifyRepositoryPath(rootPath, architectureImportBoundaries) {
    const snapshot = await (0, repository_indexer_1.indexRepository)(rootPath);
    const graph = (0, context_graph_1.buildContextGraphFromSnapshot)(snapshot);
    const config = await (0, config_1.loadCodeForgeConfig)(rootPath);
    const autoDetectLayers = config.architecture?.autoDetectLayers ?? true;
    const detectedLayers = autoDetectLayers
        ? (0, architecture_1.detectArchitectureLayers)(snapshot.files.map((file) => file.path))
        : [];
    const detectedBoundaries = autoDetectLayers
        ? (0, architecture_1.detectDefaultArchitectureBoundaries)(detectedLayers)
        : [];
    const configuredBoundaries = architectureImportBoundaries ??
        config.architecture?.importBoundaries ??
        [];
    const allBoundaries = [
        ...detectedBoundaries,
        ...configuredBoundaries
    ].filter((boundary, index, boundaries) => boundaries.findIndex((candidate) => candidate.from.toLowerCase() === boundary.from.toLowerCase() &&
        candidate.to.toLowerCase() === boundary.to.toLowerCase()) === index);
    return (0, pipeline_1.verifyRepository)(snapshot, graph, allBoundaries);
}
