"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexRepository = indexRepository;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const DEFAULT_IGNORED_DIRECTORIES = new Set([
    ".git",
    "node_modules",
    "dist",
    "dist-tests"
]);
async function indexRepository(rootPath, ignoredDirectories = DEFAULT_IGNORED_DIRECTORIES) {
    const files = [];
    async function walk(currentPath) {
        const entries = await (0, promises_1.readdir)(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
                continue;
            }
            const fullPath = (0, node_path_1.join)(currentPath, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const fileStat = await (0, promises_1.stat)(fullPath);
            files.push({
                path: (0, node_path_1.relative)(rootPath, fullPath).replace(/\\/g, "/"),
                extension: (0, node_path_1.extname)(entry.name),
                sizeBytes: fileStat.size
            });
        }
    }
    await walk(rootPath);
    files.sort((a, b) => a.path.localeCompare(b.path));
    return {
        rootPath,
        files,
        fileCount: files.length,
        totalBytes: files.reduce((sum, file) => sum + file.sizeBytes, 0)
    };
}
