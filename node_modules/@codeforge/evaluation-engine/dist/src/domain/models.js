"use strict";
/**
 * CodeForge — Chapter 14 Evaluation Engine
 * Domain Model (single source of truth).
 *
 * Every other layer (schema, validation, canonicalization, evaluation,
 * findings, WAL, CLI) must agree with this file. Do not introduce a
 * second incompatible representation of these types elsewhere.
 *
 * semantics_version: "2.0.0"
 * evaluator_version:  "3.1.0"
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVIDENCE_CLASSES = exports.GENESIS_HASH = exports.EVALUATOR_VERSION = exports.SEMANTICS_VERSION = void 0;
exports.SEMANTICS_VERSION = "2.0.0";
exports.EVALUATOR_VERSION = "3.1.0";
exports.GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000";
exports.EVIDENCE_CLASSES = [
    "Structural",
    "Dependency",
    "Interface",
    "Configuration",
    "Baseline",
    "Traceability",
    "ExecutionTrace",
];
