"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-005 passes when all context graph node IDs are unique", () => {
    const violations = rules_1.duplicateNodeIdsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "file:index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                },
                {
                    id: "file:app.ts",
                    kind: "file",
                    label: "app.ts",
                    path: "src/app.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-005 detects duplicate context graph node IDs", () => {
    const violations = rules_1.duplicateNodeIdsRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "file:index.ts",
                    kind: "file",
                    label: "index.ts",
                    path: "src/index.ts"
                },
                {
                    id: "file:index.ts",
                    kind: "file",
                    label: "another-index.ts",
                    path: "src/another-index.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-005");
    strict_1.default.equal(violations[0].target, "file:index.ts");
});
