"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const canonicalizer_1 = require("../src/canonicalization/canonicalizer");
const policy_1 = require("../src/canonicalization/policy");
(0, node_test_1.test)("object key ordering: keys are sorted deterministically", () => {
    const value = { z: 1, a: 2, m: 3 };
    const canonical = (0, canonicalizer_1.canonicalizeValue)(value, policy_1.DEFAULT_CANONICALIZATION_POLICY);
    strict_1.default.equal((0, canonicalizer_1.canonicalJsonStringify)(canonical), '{"a":2,"m":3,"z":1}');
});
(0, node_test_1.test)("ordered arrays preserve input order", () => {
    const policy = {
        defaultSemantics: "UNORDERED",
        pathSemanticsMap: { "$.events": "ORDERED" },
    };
    const value = { events: ["deploy", "test", "compile"] };
    const canonical = (0, canonicalizer_1.canonicalizeValue)(value, policy);
    strict_1.default.deepEqual(canonical.events, [
        "deploy",
        "test",
        "compile",
    ]);
});
(0, node_test_1.test)("unordered arrays normalize into a stable order regardless of input order", () => {
    const policy = {
        defaultSemantics: "UNORDERED",
        pathSemanticsMap: {},
    };
    const a = (0, canonicalizer_1.canonicalizeValue)({ deps: ["c", "a", "b"] }, policy);
    const b = (0, canonicalizer_1.canonicalizeValue)({ deps: ["b", "c", "a"] }, policy);
    strict_1.default.equal((0, canonicalizer_1.canonicalJsonStringify)(a), (0, canonicalizer_1.canonicalJsonStringify)(b));
});
(0, node_test_1.test)("exact path semantics take precedence over wildcard and default", () => {
    const policy = {
        defaultSemantics: "UNORDERED",
        pathSemanticsMap: {
            "$.events[0]": "ORDERED",
            "$.events[*]": "UNORDERED",
        },
    };
    strict_1.default.equal((0, policy_1.resolvePathSemantics)("$.events[0]", policy), "ORDERED");
});
(0, node_test_1.test)("wildcard path semantics take precedence over default", () => {
    const policy = {
        defaultSemantics: "UNORDERED",
        pathSemanticsMap: { "$.events[*]": "ORDERED" },
    };
    strict_1.default.equal((0, policy_1.resolvePathSemantics)("$.events[5]", policy), "ORDERED");
});
(0, node_test_1.test)("default semantics apply when no exact or wildcard match exists", () => {
    const policy = {
        defaultSemantics: "UNORDERED",
        pathSemanticsMap: {},
    };
    strict_1.default.equal((0, policy_1.resolvePathSemantics)("$.something.else", policy), "UNORDERED");
});
(0, node_test_1.test)("nested wildcard paths normalize numeric indexes only, not digits in names", () => {
    strict_1.default.equal((0, policy_1.toWildcardPath)("$.events[12].dependencies[3]"), "$.events[*].dependencies[*]");
    // A property name containing digits must NOT be mistaken for an index.
    strict_1.default.equal((0, policy_1.toWildcardPath)("$.service2.events[0]"), "$.service2.events[*]");
});
(0, node_test_1.test)("execution trace event ordering is preserved end-to-end via the default policy", () => {
    const trace = {
        events: [
            { step: 1, action: "compile" },
            { step: 2, action: "test" },
            { step: 3, action: "deploy" },
        ],
    };
    const reordered = {
        events: [
            { step: 3, action: "deploy" },
            { step: 2, action: "test" },
            { step: 1, action: "compile" },
        ],
    };
    const canonicalA = (0, canonicalizer_1.canonicalJsonStringify)((0, canonicalizer_1.canonicalizeValue)(trace, policy_1.DEFAULT_CANONICALIZATION_POLICY));
    const canonicalB = (0, canonicalizer_1.canonicalJsonStringify)((0, canonicalizer_1.canonicalizeValue)(reordered, policy_1.DEFAULT_CANONICALIZATION_POLICY));
    // Execution order is semantic: differently-ordered traces must remain
    // differently canonicalized.
    strict_1.default.notEqual(canonicalA, canonicalB);
});
(0, node_test_1.test)("dependencies within an execution trace event are unordered", () => {
    const a = { events: [{ step: 1, action: "x", dependencies: ["b", "a"] }] };
    const b = { events: [{ step: 1, action: "x", dependencies: ["a", "b"] }] };
    const canonicalA = (0, canonicalizer_1.canonicalJsonStringify)((0, canonicalizer_1.canonicalizeValue)(a, policy_1.DEFAULT_CANONICALIZATION_POLICY));
    const canonicalB = (0, canonicalizer_1.canonicalJsonStringify)((0, canonicalizer_1.canonicalizeValue)(b, policy_1.DEFAULT_CANONICALIZATION_POLICY));
    strict_1.default.equal(canonicalA, canonicalB);
});
(0, node_test_1.test)("canonicalization never mutates the original input", () => {
    const original = { z: 1, deps: ["c", "a"] };
    const originalCopy = JSON.parse(JSON.stringify(original));
    (0, canonicalizer_1.canonicalizeValue)(original, policy_1.DEFAULT_CANONICALIZATION_POLICY);
    strict_1.default.deepEqual(original, originalCopy);
});
