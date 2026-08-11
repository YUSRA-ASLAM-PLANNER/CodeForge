import Ajv, { type ValidateFunction, type ErrorObject } from "ajv";
import { SchemaValidationError } from "../errors";
import type { Chapter14EvaluationContext } from "../domain/models";
import chapter14Schema from "../schema/chapter14.schema.json";

let cachedValidator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
  if (cachedValidator !== undefined) {
    return cachedValidator;
  }
  const ajv = new Ajv({
    allErrors: true,
    strict: false, // the schema intentionally mixes `allOf`/`if`/`then` with base `required`
  });
  cachedValidator = ajv.compile(chapter14Schema);
  return cachedValidator;
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
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
export function validateSchema(input: unknown): Chapter14EvaluationContext {
  const validate = getValidator();
  const valid = validate(input);
  if (!valid) {
    throw new SchemaValidationError(
      `Chapter14EvaluationContext failed schema validation: ${formatErrors(validate.errors)}`
    );
  }
  // Boundary cast: AJV has structurally verified `input` against the same
  // schema that mirrors domain/models.ts. This is the one place a cast is
  // necessary and it is guarded by real runtime validation immediately above.
  return input as Chapter14EvaluationContext;
}
