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
    return engine.verify({
        files: repository.files.map((file) => file.path),
        graph
    });
}
