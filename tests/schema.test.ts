import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSchema } from "../src/validation/schemaValidator";
import { SchemaValidationError } from "../src/errors";
import { baseContext, clone, mutable } from "./fixtures";

test("schema: valid minimal context passes", () => {
  const ctx = validateSchema(baseContext());
  assert.equal(ctx.requirements.length, 1);
});

test("schema: missing root collection is rejected", () => {
  const input = mutable(clone(baseContext())) as unknown as Record<string, unknown>;
  delete input.baselines;
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: wrong collection type is rejected", () => {
  const input = mutable(clone(baseContext())) as unknown as Record<string, unknown>;
  input.requirements = "not-an-array";
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: missing required property is rejected", () => {
  const input = mutable(clone(baseContext()));
  // @ts-expect-error intentionally malformed for test
  delete input.requirements[0].constraint_level;
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: unknown property is rejected", () => {
  const input = mutable(clone(baseContext())) as unknown as Record<string, unknown>;
  (input.requirements as Record<string, unknown>[])[0]!.extra_field = "nope";
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: invalid enum value is rejected", () => {
  const input = mutable(clone(baseContext()));
  // @ts-expect-error intentionally invalid enum for test
  input.requirements[0].constraint_level = "Bogus";
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: malformed predicate (unknown type) is rejected", () => {
  const input = mutable(clone(baseContext()));
  // @ts-expect-error intentionally invalid for test
  input.criteria[0].structured_predicate.type = "NOT_A_TYPE";
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: ATTRIBUTE_EQUALS missing 'expected' is rejected", () => {
  const input = mutable(clone(baseContext()));
  input.criteria[0]!.structured_predicate = {
    type: "ATTRIBUTE_EQUALS",
    evidence_class: "Interface",
    attribute: "health_check_path",
  } as never;
  assert.throws(() => validateSchema(input), SchemaValidationError);
});

test("schema: ATTRIBUTE_EXISTS with unexpected 'expected' is rejected", () => {
  const input = mutable(clone(baseContext()));
  input.criteria[0]!.structured_predicate = {
    type: "ATTRIBUTE_EXISTS",
    evidence_class: "Interface",
    attribute: "health_check_path",
    expected: "should-not-be-here",
  } as never;
  assert.throws(() => validateSchema(input), SchemaValidationError);
});
