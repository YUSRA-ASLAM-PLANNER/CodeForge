"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-015 passes when every directory node has a valid path", () => {
    const violations = rules_1.directoryNodesRequireValidPathsRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "directory:src",
                    kind: "directory",
                    label: "src",
                    path: "src"
                },
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "directory:src",
                    kind: "contains"
                },
                {
                    from: "directory:src",
                    to: "file:src/index.ts",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-015 detects a directory node with missing path", () => {
    const violations = rules_1.directoryNodesRequireValidPathsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "directory:src",
                    kind: "directory",
                    label: "src"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "directory:src",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-015");
    strict_1.default.equal(violations[0].target, "directory:src");
});
(0, node_test_1.default)("ARCH-015 detects a directory node with empty path", () => {
    const violations = rules_1.directoryNodesRequireValidPathsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "directory:src",
                    kind: "directory",
                    label: "src",
                    path: "   "
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "directory:src",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-015");
    strict_1.default.equal(violations[0].target, "directory:src");
});
