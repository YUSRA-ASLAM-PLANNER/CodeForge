"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-021 passes when every directory exists in repository structure", () => {
    const violations = rules_1.directoryNodesMustMatchRepositoryStructureRule.check({
        files: ["src/index.ts", "src/utils/helper.ts"],
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
                    id: "directory:src/utils",
                    kind: "directory",
                    label: "utils",
                    path: "src/utils"
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
                    to: "directory:src/utils",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-021 detects a directory not represented in repository structure", () => {
    const violations = rules_1.directoryNodesMustMatchRepositoryStructureRule.check({
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
                    id: "directory:ghost",
                    kind: "directory",
                    label: "ghost",
                    path: "ghost"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "directory:src",
                    kind: "contains"
                },
                {
                    from: "repository:root",
                    to: "directory:ghost",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-021");
    strict_1.default.equal(violations[0].target, "directory:ghost");
});
