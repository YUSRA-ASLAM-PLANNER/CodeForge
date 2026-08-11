"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const sufficiency_1 = require("../src/evaluation/sufficiency");
function evidence(id, payload) {
    return {
        evidence_id: id,
        artifact_id: "ART-01",
        evidence_class: "Interface",
        payload: payload,
    };
}
(0, node_test_1.test)("sufficient: all conditions satisfied", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([
        { type: "CONTAIN_ATTRIBUTE", evidence_class: "Interface", attribute: "path" },
        { type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 },
    ], [evidence("E1", { path: "/a" })]);
    strict_1.default.equal(result.sufficient, true);
});
(0, node_test_1.test)("missing evidence: empty scoped evidence is insufficient", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 1 }], []);
    strict_1.default.equal(result.sufficient, false);
});
(0, node_test_1.test)("missing attribute: CONTAIN_ATTRIBUTE fails when no item has it", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([{ type: "CONTAIN_ATTRIBUTE", evidence_class: "Interface", attribute: "path" }], [evidence("E1", { other: 1 })]);
    strict_1.default.equal(result.sufficient, false);
});
(0, node_test_1.test)("missing key: CONTAIN_KEY fails when no item has it", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([{ type: "CONTAIN_KEY", evidence_class: "Interface", key: "path" }], [evidence("E1", { other: 1 })]);
    strict_1.default.equal(result.sufficient, false);
});
(0, node_test_1.test)("minimum count satisfied", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 2 }], [evidence("E1", {}), evidence("E2", {})]);
    strict_1.default.equal(result.sufficient, true);
});
(0, node_test_1.test)("minimum count not satisfied", () => {
    const result = (0, sufficiency_1.evaluateSufficiency)([{ type: "MIN_COUNT", evidence_class: "Interface", min_count: 3 }], [evidence("E1", {}), evidence("E2", {})]);
    strict_1.default.equal(result.sufficient, false);
});
