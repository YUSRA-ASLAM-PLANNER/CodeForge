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
const indexer_1 = require("../src/indexer");
(0, node_test_1.default)("indexes repository files deterministically", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-indexer-"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "src"));
    await (0, promises_1.mkdir)((0, node_path_1.join)(root, "node_modules"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "README.md"), "# CodeForge");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "src", "index.ts"), "export const x = 1;");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "node_modules", "ignored.js"), "ignored");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.equal(snapshot.fileCount, 2);
    strict_1.default.deepEqual(snapshot.files.map((file) => file.path), ["README.md", "src/index.ts"]);
    strict_1.default.equal(snapshot.files[0].extension, ".md");
    strict_1.default.equal(snapshot.files[1].extension, ".ts");
});
(0, node_test_1.default)("returns files in sorted path order", async () => {
    const root = await (0, promises_1.mkdtemp)((0, node_path_1.join)((0, node_os_1.tmpdir)(), "codeforge-indexer-"));
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "z.ts"), "z");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "a.ts"), "a");
    await (0, promises_1.writeFile)((0, node_path_1.join)(root, "m.ts"), "m");
    const snapshot = await (0, indexer_1.indexRepository)(root);
    strict_1.default.deepEqual(snapshot.files.map((file) => file.path), ["a.ts", "m.ts", "z.ts"]);
});
