"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
const ajv_1 = __importDefault(require("ajv"));
const errors_1 = require("../errors");
const chapter14_schema_json_1 = __importDefault(require("../schema/chapter14.schema.json"));
let cachedValidator;
function getValidator() {
    if (cachedValidator !== undefined) {
        return cachedValidator;
    }
    const ajv = new ajv_1.default({
        allErrors: true,
        strict: false, // the schema intentionally mixes `allOf`/`if`/`then` with base `required`
    });
    cachedValidator = ajv.compile(chapter14_schema_json_1.default);
    return cachedValidator;
}
function formatErrors(errors) {
    if (!errors || errors.length === 0) {
        return "unknown schema validation failure";
    }
    return errors
        .map((e) => `${e.instancePath || "$"} ${e.message ?? "invalid"}`)
        .join("; ");
}
/**
 * Validate raw parsed JSON against the Chapter 14 Draft-07 JSON Schema.
 * Throws SchemaValidationError (ERR_SCHEMA_VALIDATION) on any failure.
 * Returns the input narrowed to Chapter14EvaluationContext on success.
 *
 * This is a structural validation boundary: input is `unknown` until it
 * passes here, at which point the cast to the domain type is justified
 * because AJV has verified conformance to the same contract the domain
 * model represents.
 */
function validateSchema(input) {
    const validate = getValidator();
    const valid = validate(input);
    if (!valid) {
        throw new errors_1.SchemaValidationError(`Chapter14EvaluationContext failed schema validation: ${formatErrors(validate.errors)}`);
    }
    // Boundary cast: AJV has structurally verified `input` against the same
    // schema that mirrors domain/models.ts. This is the one place a cast is
    // necessary and it is guarded by real runtime validation immediately above.
    return input;
}
