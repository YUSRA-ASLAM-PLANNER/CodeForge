"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-018 passes when contains edges point from parent to child", () => {
    const violations = rules_1.containsEdgesMustPointParentToChildRule.check({
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
                    label: "src/index.ts",
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
(0, node_test_1.default)("ARCH-018 detects a reversed contains edge", () => {
    const violations = rules_1.containsEdgesMustPointParentToChildRule.check({
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
                    label: "src/index.ts",
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
                    from: "file:src/index.ts",
                    to: "directory:src",
                    kind: "contains"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-018");
    strict_1.default.equal(violations[0].target, "file:src/index.ts->directory:src");
});
