"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-003 passes when every context graph file exists in repository", () => {
    const violations = rules_1.contextGraphFilesExistInRepositoryRule.check({
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
(0, node_test_1.default)("ARCH-003 detects a context graph file missing from repository index", () => {
    const violations = rules_1.contextGraphFilesExistInRepositoryRule.check({
        files: ["src/index.ts"],
        graph: {
            nodes: [
                {
                    id: "file:src/missing.ts",
                    kind: "file",
                    label: "missing.ts",
                    path: "src/missing.ts"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-003");
    strict_1.default.equal(violations[0].target, "src/missing.ts");
});
