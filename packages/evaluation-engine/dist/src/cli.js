#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeForgeError = void 0;
exports.runPipeline = runPipeline;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const schemaValidator_1 = require("./validation/schemaValidator");
const validator_1 = require("./validation/validator");
const evaluator_1 = require("./evaluation/evaluator");
const store_1 = require("./persistence/store");
const policy_1 = require("./canonicalization/policy");
const errors_1 = require("./errors");
Object.defineProperty(exports, "isCodeForgeError", { enumerable: true, get: function () { return errors_1.isCodeForgeError; } });
/**
 * Execute the full Chapter 14 production pipeline (Section 25):
 *   read -> parse -> schema validation -> domain validation ->
 *   referential integrity -> (canonicalization happens lazily per-evidence
 *   during evaluation) -> load & validate WAL -> evaluate
 *   (applicability -> sufficiency -> predicate) -> construct findings ->
 *   idempotently persist -> deterministic result.
 */
function runPipeline(inputPath, walPath) {
    const raw = fs.readFileSync(inputPath, "utf8");
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch (err) {
        throw new errors_1.SchemaValidationError(`Input at '${inputPath}' is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
    const context = (0, schemaValidator_1.validateSchema)(parsed);
    (0, validator_1.validateDomain)(context);
    const store = new store_1.FindingStore(walPath);
    // Loading validates the existing WAL's hash chain and structure up front,
    // so any prior corruption is surfaced before new work is attempted.
    store.loadAll();
    const findings = (0, evaluator_1.evaluateAll)({
        context,
        canonicalizationPolicy: policy_1.DEFAULT_CANONICALIZATION_POLICY,
    });
    let newlyPersistedCount = 0;
    let alreadyPersistedCount = 0;
    for (const finding of findings) {
        const appended = store.persist(finding);
        if (appended) {
            newlyPersistedCount += 1;
        }
        else {
            alreadyPersistedCount += 1;
        }
    }
    return { findings, newlyPersistedCount, alreadyPersistedCount };
}
function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        // eslint-disable-next-line no-console
        console.error("Usage: ch14 <input.json> [wal.jsonl]");
        process.exitCode = 2;
        return;
    }
    const inputPath = path.resolve(args[0]);
    const walPath = path.resolve(args[1] ?? "chapter14.wal.jsonl");
    try {
        const result = runPipeline(inputPath, walPath);
        const output = {
            findings: result.findings,
            summary: {
                total: result.findings.length,
                newly_persisted: result.newlyPersistedCount,
                already_persisted: result.alreadyPersistedCount,
                by_result_state: summarizeByState(result.findings),
            },
        };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
    }
    catch (err) {
        const cfError = (0, errors_1.toCodeForgeError)(err);
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(cfError.toJSON(), null, 2));
        process.exitCode = 1;
    }
}
function summarizeByState(findings) {
    const summary = {};
    for (const finding of findings) {
        summary[finding.result_state] = (summary[finding.result_state] ?? 0) + 1;
    }
    return summary;
}
if (require.main === module) {
    main();
}
