"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const predicates_1 = require("../src/evaluation/predicates");
function evidence(id, payload) {
    return {
        evidence_id: id,
        artifact_id: "ART-01",
        evidence_class: "Interface",
        payload: payload,
    };
}
(0, node_test_1.test)("ATTRIBUTE_EXISTS: success when attribute present on all items", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" }, [evidence("E1", { path: "/a" })]);
    strict_1.default.equal(result.satisfied, true);
});
(0, node_test_1.test)("ATTRIBUTE_EXISTS: fails when attribute missing", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" }, [evidence("E1", { other: 1 })]);
    strict_1.default.equal(result.satisfied, false);
});
(0, node_test_1.test)("ATTRIBUTE_EQUALS: success when value matches", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" }, [evidence("E1", { mode: "prod" })]);
    strict_1.default.equal(result.satisfied, true);
});
(0, node_test_1.test)("ATTRIBUTE_EQUALS: fails when attribute missing", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" }, [evidence("E1", {})]);
    strict_1.default.equal(result.satisfied, false);
});
(0, node_test_1.test)("ATTRIBUTE_EQUALS: fails when value mismatches", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "prod" }, [evidence("E1", { mode: "debug" })]);
    strict_1.default.equal(result.satisfied, false);
});
(0, node_test_1.test)("ATTRIBUTE_NOT_EQUALS: success when value differs", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" }, [evidence("E1", { mode: "prod" })]);
    strict_1.default.equal(result.satisfied, true);
});
(0, node_test_1.test)("ATTRIBUTE_NOT_EQUALS: fails when value equals forbidden value", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" }, [evidence("E1", { mode: "debug" })]);
    strict_1.default.equal(result.satisfied, false);
});
(0, node_test_1.test)("ATTRIBUTE_NOT_EQUALS: missing attribute is a violation, NOT a pass (safety rule)", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_NOT_EQUALS", evidence_class: "Interface", attribute: "mode", expected: "debug" }, [evidence("E1", {})]);
    strict_1.default.equal(result.satisfied, false);
    strict_1.default.match(result.violations[0], /missing/);
});
(0, node_test_1.test)("no evidence: predicate cannot be satisfied over an empty evidence set", () => {
    const result = (0, predicates_1.evaluateStructuredPredicate)({ type: "ATTRIBUTE_EXISTS", evidence_class: "Interface", attribute: "path" }, []);
    strict_1.default.equal(result.satisfied, false);
});
