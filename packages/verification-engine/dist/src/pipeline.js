"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRepository = verifyRepository;
const engine_1 = require("./engine");
const rules_1 = require("./rules");
function verifyRepository(repository, graph) {
    const engine = new engine_1.VerificationEngine();
    engine.addRule(rules_1.contextGraphReferentialIntegrityRule);
    engine.addRule(rules_1.indexedFilesExistInContextGraphRule);
    engine.addRule(rules_1.contextGraphFilesExistInRepositoryRule);
    engine.addRule(rules_1.duplicateFileNodesRule);
    engine.addRule(rules_1.fileNodesRequireValidPathsRule);
    engine.addRule(rules_1.validContextGraphEdgeKindsRule);
    engine.addRule(rules_1.repositoryNodeRequiredRule);
    engine.addRule(rules_1.repositoryNodeIdRule);
    engine.addRule(rules_1.repositoryNodeMustBeRootRule);
    return engine.verify({
        files: repository.files.map((file) => file.path),
        graph
    });
}
