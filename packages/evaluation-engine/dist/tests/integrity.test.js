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
const evidenceIntegrity_1 = require("../src/canonicalization/evidenceIntegrity");
const policy_1 = require("../src/canonicalization/policy");
const errors_1 = require("../src/errors");
const wal_1 = require("../src/persistence/wal");
function tempFile() {
    return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ch14-wal-")), "wal.jsonl");
}
function sampleFinding(overrides = {}) {
    return {
        finding_id: "f".repeat(64),
        target_artifact_id: "ART-01",
        requirement_id: "REQ-01",
        criterion_id: "CRIT-01",
        result_state: "Conforming",
        rationale: "ok",
        predicate_hash: "p".repeat(64),
        sufficiency_hash: "s".repeat(64),
        evidence_refs: [],
        evaluator_version: "3.1.0",
        semantics_version: "2.0.0",
        canonicalization_policy_hash: "c".repeat(64),
        ...overrides,
    };
}
(0, node_test_1.test)("evidence integrity: correct hash authenticates", () => {
    const evidence = {
        evidence_id: "E1",
        artifact_id: "ART-01",
        evidence_class: "Interface",
        payload: { a: 1 },
    };
    const expected = (0, evidenceIntegrity_1.computeEvidenceIntegrityIdentifier)(evidence, policy_1.DEFAULT_CANONICALIZATION_POLICY);
    const withHash = { ...evidence, integrity_identifier: expected };
    const result = (0, evidenceIntegrity_1.authenticateEvidence)(withHash, policy_1.DEFAULT_CANONICALIZATION_POLICY);
    strict_1.default.equal(result, expected);
});
(0, node_test_1.test)("evidence integrity: incorrect hash is rejected", () => {
    const evidence = {
        evidence_id: "E1",
        artifact_id: "ART-01",
        evidence_class: "Interface",
        payload: { a: 1 },
        integrity_identifier: "0".repeat(64),
    };
    strict_1.default.throws(() => (0, evidenceIntegrity_1.authenticateEvidence)(evidence, policy_1.DEFAULT_CANONICALIZATION_POLICY), errors_1.IntegrityMismatchError);
});
(0, node_test_1.test)("WAL: hash verification succeeds for a properly appended chain", () => {
    const wal = new wal_1.WriteAheadLog(tempFile());
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));
    const records = wal.load();
    strict_1.default.equal(records.length, 2);
    strict_1.default.equal(records[0].sequence_number, 1);
    strict_1.default.equal(records[1].sequence_number, 2);
});
(0, node_test_1.test)("WAL: chain break (tampered record_hash) is detected", () => {
    const file = tempFile();
    const wal = new wal_1.WriteAheadLog(file);
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    const record = JSON.parse(lines[0]);
    record.record_hash = "0".repeat(64);
    lines[0] = JSON.stringify(record);
    fs.writeFileSync(file, lines.join("\n") + "\n");
    strict_1.default.throws(() => new wal_1.WriteAheadLog(file).load(), errors_1.WalCorruptionError);
});
(0, node_test_1.test)("WAL: sequence gap is detected", () => {
    const file = tempFile();
    const wal = new wal_1.WriteAheadLog(file);
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));
    const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
    const record = JSON.parse(lines[1]);
    record.sequence_number = 5;
    lines[1] = JSON.stringify(record);
    fs.writeFileSync(file, lines.join("\n") + "\n");
    strict_1.default.throws(() => new wal_1.WriteAheadLog(file).load(), errors_1.WalCorruptionError);
});
(0, node_test_1.test)("WAL: corrupted JSON line is detected", () => {
    const file = tempFile();
    fs.writeFileSync(file, '{"not valid json\n');
    strict_1.default.throws(() => new wal_1.WriteAheadLog(file).load(), errors_1.WalCorruptionError);
});
(0, node_test_1.test)("WAL: idempotency — appending the same finding twice does not duplicate", () => {
    const file = tempFile();
    const wal = new wal_1.WriteAheadLog(file);
    const finding = sampleFinding({ finding_id: "1".repeat(64) });
    const first = wal.appendFindingIdempotent(finding);
    const second = wal.appendFindingIdempotent(finding);
    strict_1.default.equal(first, true);
    strict_1.default.equal(second, false);
    strict_1.default.equal(wal.load().length, 1);
});
(0, node_test_1.test)("WAL: same finding_id with different content raises tamper error", () => {
    const file = tempFile();
    const wal = new wal_1.WriteAheadLog(file);
    wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64), result_state: "Conforming" }));
    strict_1.default.throws(() => wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64), result_state: "Non-Conforming" })), errors_1.TamperDetectedError);
});
