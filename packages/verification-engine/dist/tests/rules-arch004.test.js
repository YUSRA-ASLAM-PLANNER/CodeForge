"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-004 passes when file nodes are unique", () => {
    const violations = rules_1.duplicateFileNodesRule.check({
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
(0, node_test_1.default)("ARCH-004 detects duplicate file nodes", () => {
    const violations = rules_1.duplicateFileNodesRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                },
                {
                    id: "file:src/index.ts#duplicate",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-004");
    strict_1.default.equal(violations[0].target, "src/index.ts");
});
