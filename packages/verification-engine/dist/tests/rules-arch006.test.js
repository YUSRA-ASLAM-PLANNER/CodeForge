"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-006 passes when every file node has a valid path", () => {
    const violations = rules_1.fileNodesRequireValidPathsRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-006 detects a file node with missing path", () => {
    const violations = rules_1.fileNodesRequireValidPathsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "file:missing",
                    kind: "file",
                    label: "missing"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-006");
});
(0, node_test_1.default)("ARCH-006 detects a file node with empty path", () => {
    const violations = rules_1.fileNodesRequireValidPathsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "file:empty",
                    kind: "file",
                    label: "empty",
                    path: "   "
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-006");
});
