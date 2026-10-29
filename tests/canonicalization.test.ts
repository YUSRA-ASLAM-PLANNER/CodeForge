import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeValue,
  canonicalJsonStringify,
} from "../packages/evaluation-engine/src/canonicalization/canonicalizer";
import {
  resolvePathSemantics,
  toWildcardPath,
  DEFAULT_CANONICALIZATION_POLICY,
  type CanonicalizationPolicy,
} from "../packages/evaluation-engine/src/canonicalization/policy";
import type { JsonValue } from "../packages/evaluation-engine/src/domain/models";

test("object key ordering: keys are sorted deterministically", () => {
  const value: JsonValue = { z: 1, a: 2, m: 3 };
  const canonical = canonicalizeValue(value, DEFAULT_CANONICALIZATION_POLICY);
  assert.equal(canonicalJsonStringify(canonical), '{"a":2,"m":3,"z":1}');
});

test("ordered arrays preserve input order", () => {
  const policy: CanonicalizationPolicy = {
    defaultSemantics: "UNORDERED",
    pathSemanticsMap: { "$.events": "ORDERED" },
  };
  const value: JsonValue = { events: ["deploy", "test", "compile"] };
  const canonical = canonicalizeValue(value, policy);
  assert.deepEqual((canonical as { events: JsonValue[] }).events, [
    "deploy",
    "test",
    "compile",
  ]);
});

test("unordered arrays normalize into a stable order regardless of input order", () => {
  const policy: CanonicalizationPolicy = {
    defaultSemantics: "UNORDERED",
    pathSemanticsMap: {},
  };
  const a = canonicalizeValue({ deps: ["c", "a", "b"] }, policy);
  const b = canonicalizeValue({ deps: ["b", "c", "a"] }, policy);
  assert.equal(canonicalJsonStringify(a), canonicalJsonStringify(b));
});

test("exact path semantics take precedence over wildcard and default", () => {
  const policy: CanonicalizationPolicy = {
    defaultSemantics: "UNORDERED",
    pathSemanticsMap: {
      "$.events[0]": "ORDERED",
      "$.events[*]": "UNORDERED",
    },
  };
  assert.equal(resolvePathSemantics("$.events[0]", policy), "ORDERED");
});

test("wildcard path semantics take precedence over default", () => {
  const policy: CanonicalizationPolicy = {
    defaultSemantics: "UNORDERED",
    pathSemanticsMap: { "$.events[*]": "ORDERED" },
  };
  assert.equal(resolvePathSemantics("$.events[5]", policy), "ORDERED");
});

test("default semantics apply when no exact or wildcard match exists", () => {
  const policy: CanonicalizationPolicy = {
    defaultSemantics: "UNORDERED",
    pathSemanticsMap: {},
  };
  assert.equal(resolvePathSemantics("$.something.else", policy), "UNORDERED");
});

test("nested wildcard paths normalize numeric indexes only, not digits in names", () => {
  assert.equal(
    toWildcardPath("$.events[12].dependencies[3]"),
    "$.events[*].dependencies[*]"
  );
  // A property name containing digits must NOT be mistaken for an index.
  assert.equal(toWildcardPath("$.service2.events[0]"), "$.service2.events[*]");
});

test("execution trace event ordering is preserved end-to-end via the default policy", () => {
  const trace: JsonValue = {
    events: [
      { step: 1, action: "compile" },
      { step: 2, action: "test" },
      { step: 3, action: "deploy" },
    ],
  };
  const reordered: JsonValue = {
    events: [
      { step: 3, action: "deploy" },
      { step: 2, action: "test" },
      { step: 1, action: "compile" },
    ],
  };
  const canonicalA = canonicalJsonStringify(
    canonicalizeValue(trace, DEFAULT_CANONICALIZATION_POLICY)
  );
  const canonicalB = canonicalJsonStringify(
    canonicalizeValue(reordered, DEFAULT_CANONICALIZATION_POLICY)
  );
  // Execution order is semantic: differently-ordered traces must remain
  // differently canonicalized.
  assert.notEqual(canonicalA, canonicalB);
});

test("dependencies within an execution trace event are unordered", () => {
  const a: JsonValue = { events: [{ step: 1, action: "x", dependencies: ["b", "a"] }] };
  const b: JsonValue = { events: [{ step: 1, action: "x", dependencies: ["a", "b"] }] };
  const canonicalA = canonicalJsonStringify(
    canonicalizeValue(a, DEFAULT_CANONICALIZATION_POLICY)
  );
  const canonicalB = canonicalJsonStringify(
    canonicalizeValue(b, DEFAULT_CANONICALIZATION_POLICY)
  );
  assert.equal(canonicalA, canonicalB);
});

test("canonicalization never mutates the original input", () => {
  const original: JsonValue = { z: 1, deps: ["c", "a"] };
  const originalCopy = JSON.parse(JSON.stringify(original));
  canonicalizeValue(original, DEFAULT_CANONICALIZATION_POLICY);
  assert.deepEqual(original, originalCopy);
});
