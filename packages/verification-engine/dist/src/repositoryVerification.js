"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRepositoryPath = analyzeRepositoryPath;
exports.verifyRepositoryPath = verifyRepositoryPath;
const repository_indexer_1 = require("@codeforge/repository-indexer");
const context_graph_1 = require("@codeforge/context-graph");
const pipeline_1 = require("./pipeline");
const config_1 = require("./config");
const architecture_1 = require("./architecture");
async function analyzeRepositoryPath(rootPath, architectureImportBoundaries) {
    const config = await (0, config_1.loadCodeForgeConfig)(rootPath);
    const snapshot = await (0, repository_indexer_1.indexRepository)(rootPath, undefined, undefined, config.scan?.exclude);
    const graph = (0, context_graph_1.buildContextGraphFromSnapshot)(snapshot);
    const autoDetectLayers = config.architecture?.autoDetectLayers ?? true;
    const configuredBoundaries = architectureImportBoundaries ??
        config.architecture?.importBoundaries ??
        [];
    const configuredBoundarySource = architectureImportBoundaries !== undefined
        ? "analysis options"
        : config.source ?? "none";
    const detectedLayers = (0, architecture_1.detectArchitectureLayers)(snapshot.files.map((file) => file.path), configuredBoundaries.flatMap(({ from, to }) => [from, to]));
    const suggestedBoundaries = (0, architecture_1.detectDefaultArchitectureBoundaries)(detectedLayers);
    const detectedBoundaries = autoDetectLayers ? suggestedBoundaries : [];
    const allBoundaries = [
        ...detectedBoundaries,
        ...configuredBoundaries
    ].filter((boundary, index, boundaries) => boundaries.findIndex((candidate) => candidate.from.toLowerCase() === boundary.from.toLowerCase() &&
        candidate.to.toLowerCase() === boundary.to.toLowerCase()) === index);
    const result = (0, pipeline_1.verifyRepository)(snapshot, graph, allBoundaries);
    return {
        snapshot,
        graph,
        architectureImportBoundaries: allBoundaries,
        architectureConfiguration: {
            autoDetectionEnabled: autoDetectLayers,
            layers: detectedLayers.map(({ name, files }) => ({
                name,
                fileCount: files.length,
                sampleFiles: files.slice(0, 3)
            })),
            suggestedBoundaries,
            automaticBoundaries: detectedBoundaries,
            configuredBoundaries,
            configuredBoundarySource,
            effectiveBoundaries: allBoundaries
        },
        result
    };
}
async function verifyRepositoryPath(rootPath, architectureImportBoundaries) {
    const analysis = await analyzeRepositoryPath(rootPath, architectureImportBoundaries);
    return analysis.result;
}
