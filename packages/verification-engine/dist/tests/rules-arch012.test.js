"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-012 passes when edges are unique", () => {
    const violations = rules_1.duplicateEdgesRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "file:index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "index.ts"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "file:index.ts",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-012 detects duplicate edges", () => {
    const violations = rules_1.duplicateEdgesRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                },
                {
                    id: "file:index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "index.ts"
                }
            ],
            edges: [
                {
                    from: "repository:root",
                    to: "file:index.ts",
                    kind: "contains"
                },
                {
                    from: "repository:root",
                    to: "file:index.ts",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-012");
});
