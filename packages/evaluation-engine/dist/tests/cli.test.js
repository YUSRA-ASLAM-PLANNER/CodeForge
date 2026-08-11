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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const cli_1 = require("../src/cli");
const fixtures_1 = require("./fixtures");
const errors_1 = require("../src/errors");
const errors_2 = require("../src/errors");
function tempDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "ch14-cli-"));
}
function writeInput(ctx, dir) {
    const p = path.join(dir, "input.json");
    fs.writeFileSync(p, JSON.stringify(ctx));
    return p;
}
(0, node_test_1.test)("CLI: complete successful evaluation (Conforming)", () => {
    const dir = tempDir();
    const input = writeInput((0, fixtures_1.baseContext)(), dir);
    const wal = path.join(dir, "wal.jsonl");
    const result = (0, cli_1.runPipeline)(input, wal);
    strict_1.default.equal(result.findings.length, 1);
    strict_1.default.equal(result.findings[0].result_state, "Conforming");
});
(0, node_test_1.test)("CLI: insufficient evidence", () => {
    const dir = tempDir();
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.observed_evidence = [];
    const input = writeInput(ctx, dir);
    const wal = path.join(dir, "wal.jsonl");
    const result = (0, cli_1.runPipeline)(input, wal);
    strict_1.default.equal(result.findings[0].result_state, "Insufficient Evidence");
});
(0, node_test_1.test)("CLI: non-conforming", () => {
    const dir = tempDir();
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.observed_evidence[0].payload = { wrong_attribute: true };
    const input = writeInput(ctx, dir);
    const wal = path.join(dir, "wal.jsonl");
    const result = (0, cli_1.runPipeline)(input, wal);
    strict_1.default.equal(result.findings[0].result_state, "Non-Conforming");
});
(0, node_test_1.test)("CLI: not applicable", () => {
    const dir = tempDir();
    const ctx = (0, fixtures_1.mutable)((0, fixtures_1.clone)((0, fixtures_1.baseContext)()));
    ctx.artifacts = [...ctx.artifacts, { artifact_id: "ART-02", artifact_type: "service" }];
    ctx.criteria[0].applicability = { artifact_ids: ["ART-02"] };
    const input = writeInput(ctx, dir);
    const wal = path.join(dir, "wal.jsonl");
    const result = (0, cli_1.runPipeline)(input, wal);
    const notApplicable = result.findings.find((f) => f.target_artifact_id === "ART-01");
    strict_1.default.equal(notApplicable?.result_state, "Not Applicable");
    strict_1.default.equal(notApplicable?.evidence_refs.length, 0);
});
(0, node_test_1.test)("CLI: malformed input raises a schema validation error", () => {
    const dir = tempDir();
    const input = path.join(dir, "bad.json");
    fs.writeFileSync(input, "{not valid json");
    const wal = path.join(dir, "wal.jsonl");
    strict_1.default.throws(() => (0, cli_1.runPipeline)(input, wal), errors_1.SchemaValidationError);
});
(0, node_test_1.test)("CLI: corrupted WAL is rejected before evaluation proceeds", () => {
    const dir = tempDir();
    const input = writeInput((0, fixtures_1.baseContext)(), dir);
    const wal = path.join(dir, "wal.jsonl");
    fs.writeFileSync(wal, '{"sequence_number":1,"previous_hash":"x"}\n');
    strict_1.default.throws(() => (0, cli_1.runPipeline)(input, wal), errors_2.WalCorruptionError);
});
(0, node_test_1.test)("CLI: repeated execution is idempotent (no duplicate findings persisted)", () => {
    const dir = tempDir();
    const input = writeInput((0, fixtures_1.baseContext)(), dir);
    const wal = path.join(dir, "wal.jsonl");
    const first = (0, cli_1.runPipeline)(input, wal);
    const second = (0, cli_1.runPipeline)(input, wal);
    strict_1.default.equal(first.newlyPersistedCount, 1);
    strict_1.default.equal(second.newlyPersistedCount, 0);
    strict_1.default.equal(second.alreadyPersistedCount, 1);
    strict_1.default.equal(first.findings[0].finding_id, second.findings[0].finding_id);
});
