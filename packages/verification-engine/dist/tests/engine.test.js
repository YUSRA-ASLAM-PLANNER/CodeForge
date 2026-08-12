"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const engine_1 = require("../src/engine");
(0, node_test_1.default)("passes when all verification rules pass", () => {
    const engine = new engine_1.VerificationEngine();
    engine.addRule({
        id: "ARCH-001",
        description: "Example passing rule",
        severity: "error",
        check: () => []
    });
    const result = engine.verify({
        files: ["src/index.ts"],
        graph: {
            nodes: [],
            edges: []
        }
    });
    strict_1.default.equal(result.passed, true);
    strict_1.default.deepEqual(result.violations, []);
});
(0, node_test_1.default)("reports violations from failed rules", () => {
    const engine = new engine_1.VerificationEngine();
    engine.addRule({
        id: "ARCH-001",
        description: "Example failing rule",
        severity: "error",
        check: () => [
            {
                ruleId: "ARCH-001",
                severity: "error",
                message: "Forbidden dependency detected",
                target: "src/api.ts"
            }
        ]
    });
    const result = engine.verify({
        files: ["src/api.ts"],
        graph: {
            nodes: [],
            edges: []
        }
    });
    strict_1.default.equal(result.passed, false);
    strict_1.default.equal(result.violations.length, 1);
    strict_1.default.equal(result.violations[0].target, "src/api.ts");
});
(0, node_test_1.default)("rejects duplicate rule IDs", () => {
    const engine = new engine_1.VerificationEngine();
    const rule = {
        id: "ARCH-001",
        description: "Duplicate test rule",
        severity: "warning",
        check: () => []
    };
    engine.addRule(rule);
    strict_1.default.throws(() => engine.addRule(rule), /Verification rule already exists/);
});
