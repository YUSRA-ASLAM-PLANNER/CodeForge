"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const engine_1 = require("../src/engine");
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-001 passes when all edges reference existing nodes", () => {
    const engine = new engine_1.VerificationEngine();
    engine.addRule(rules_1.contextGraphReferentialIntegrityRule);
    const result = engine.verify({
        files: ["src/a.ts", "src/b.ts"],
        graph: {
            nodes: [
                { id: "a", kind: "file", label: "a.ts", path: "src/a.ts" },
                { id: "b", kind: "file", label: "b.ts", path: "src/b.ts" }
            ],
            edges: [
                { from: "a", to: "b", kind: "imports" }
            ]
        }
    });
    strict_1.default.equal(result.passed, true);
    strict_1.default.equal(result.violations.length, 0);
});
(0, node_test_1.default)("ARCH-001 detects an edge pointing to a missing node", () => {
    const engine = new engine_1.VerificationEngine();
    engine.addRule(rules_1.contextGraphReferentialIntegrityRule);
    const result = engine.verify({
        files: ["src/a.ts"],
        graph: {
            nodes: [
                { id: "a", kind: "file", label: "a.ts", path: "src/a.ts" }
            ],
            edges: [
                { from: "a", to: "missing", kind: "imports" }
            ]
        }
    });
    strict_1.default.equal(result.passed, false);
    strict_1.default.equal(result.violations.length, 1);
    strict_1.default.equal(result.violations[0].ruleId, "ARCH-001");
    strict_1.default.equal(result.violations[0].target, "missing");
});
