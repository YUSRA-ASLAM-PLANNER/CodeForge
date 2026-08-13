"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const rules_1 = require("../src/rules");
(0, node_test_1.default)("ARCH-007 passes when all edge kinds are supported", () => {
    const violations = rules_1.validContextGraphEdgeKindsRule.check({
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
            edges: [
                {
                    from: "file:index.ts",
                    to: "file:app.ts",
                    kind: "imports"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 0);
});
(0, node_test_1.default)("ARCH-007 detects an unsupported edge kind", () => {
    const violations = rules_1.validContextGraphEdgeKindsRule.check({
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
            edges: [
                {
                    from: "file:index.ts",
                    to: "file:app.ts",
                    kind: "calls"
                }
            ]
        }
    });
    strict_1.default.equal(violations.length, 1);
    strict_1.default.equal(violations[0].ruleId, "ARCH-007");
    strict_1.default.equal(violations[0].target, "calls");
});
