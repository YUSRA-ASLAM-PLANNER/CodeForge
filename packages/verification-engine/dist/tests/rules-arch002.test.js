"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-002 passes when every indexed file exists in context graph", () => {
    const violations = rules_1.indexedFilesExistInContextGraphRule.check({
        files: [
            "src/index.ts",
            "src/app.ts"
        ],
        graph: {
            nodes: [
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "src/index.ts",
                    path: "src/index.ts"
                },
                {
                    id: "file:src/app.ts",
                    kind: "file",
                    label: "src/app.ts",
                    path: "src/app.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-002 detects an indexed file missing from context graph", () => {
    const violations = rules_1.indexedFilesExistInContextGraphRule.check({
        files: [
            "src/index.ts",
            "src/missing.ts"
        ],
        graph: {
            nodes: [
                {
                    id: "file:src/index.ts",
                    kind: "file",
                    label: "src/index.ts",
                    path: "src/index.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-002");
    strict_1.default.equal(violations[0].target, "src/missing.ts");
});
