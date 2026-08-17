"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-020 passes when every file node matches a repository file", () => {
    const violations = rules_1.fileNodesMustMatchRepositoryFilesRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "src/index.ts",
                    path: "src/index.ts"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "file:src/index.ts",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-020 detects a file node missing from repository files", () => {
    const violations = rules_1.fileNodesMustMatchRepositoryFilesRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "file:src/missing.ts",
                    kind: "file",
                    label: "src/missing.ts",
                    path: "src/missing.ts"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "file:src/missing.ts",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-020");
    strict_1.default.equal(violations[0].target, "file:src/missing.ts");
});
