"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-009 passes when repository node uses canonical ID", () => {
    const violations = rules_1.repositoryNodeIdRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:root",
                    kind: "repository",
                    label: "CodeForge"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-009 detects repository node with invalid ID", () => {
    const violations = rules_1.repositoryNodeIdRule.check({
        files: [],
        graph: {
            nodes: [
                {
                    id: "repository:wrong",
                    kind: "repository",
                    label: "CodeForge"
                }
            ],
            edges: []
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-009");
});
