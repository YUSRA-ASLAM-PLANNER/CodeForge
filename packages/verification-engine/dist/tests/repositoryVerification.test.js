"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = require("node:fs/promises");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const repositoryVerification_1 = require("../src/repositoryVerification");
(0, node_test_1.default)("verifies a real repository path end-to-end", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "index.ts"), "export const value = 42;\n", "utf8");
    const result = await (0, repositoryVerification_1.verifyRepositoryPath)(root);
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
