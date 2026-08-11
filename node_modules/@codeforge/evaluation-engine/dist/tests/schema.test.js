"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const schemaValidator_1 = require("../src/validation/schemaValidator");
const errors_1 = require("../src/errors");
const fixtures_1 = require("./fixtures");
(0, node_test_1.test)("schema: valid minimal context passes", () => {
    const ctx = (0, schemaValidator_1.validateSchema)((0, fixtures_1.baseContext)());
    strict_1.default.equal(ctx.requirements.length, 1);
});
(0, node_test_1.test)("schema: missing root collection is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    delete input.baselines;
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: wrong collection type is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    input.requirements = "not-an-array";
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: missing required property is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    // @ts-expect-error intentionally malformed for test
    delete input.requirements[0].constraint_level;
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: unknown property is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    input.requirements[0].extra_field = "nope";
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: invalid enum value is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    // @ts-expect-error intentionally invalid enum for test
    input.requirements[0].constraint_level = "Bogus";
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: malformed predicate (unknown type) is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    // @ts-expect-error intentionally invalid for test
    input.criteria[0].structured_predicate.type = "NOT_A_TYPE";
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: ATTRIBUTE_EQUALS missing 'expected' is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    input.criteria[0].structured_predicate = {
        type: "ATTRIBUTE_EQUALS",
        evidence_class: "Interface",
        attribute: "health_check_path",
    };
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("schema: ATTRIBUTE_EXISTS with unexpected 'expected' is rejected", () => {
    const input = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    input.criteria[0].structured_predicate = {
        type: "ATTRIBUTE_EXISTS",
        evidence_class: "Interface",
        attribute: "health_check_path",
        expected: "should-not-be-here",
    };
    strict_1.default.throws(() => (0, schemaValidator_1.validateSchema)(input), errors_1.SchemaValidationError);
});
