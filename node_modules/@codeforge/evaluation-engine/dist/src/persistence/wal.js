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
exports.WriteAheadLog = void 0;
exports.computeRecordHash = computeRecordHash;
const fs = __importStar(require("fs"));
const models_1 = require("../domain/models");
const canonicalizer_1 = require("../canonicalization/canonicalizer");
const hash_1 = require("../hash");
const errors_1 = require("../errors");
/**
 * Deterministic record hash per Section 20:
 *   SHA-256(sequence_number + ":" + previous_hash + ":" + canonical finding JSON)
 */
function computeRecordHash(sequenceNumber, previousHash, finding) {
    const canonicalFinding = (0, canonicalizer_1.canonicalJsonStringify)(finding);
    return (0, hash_1.sha256Hex)(`${sequenceNumber}:${previousHash}:${canonicalFinding}`);
}
/**
 * Durable single-writer JSONL WAL.
 *
 * Concurrency invariant (Section 24): this implementation guarantees safe
 * append behavior only under a SINGLE-WRITER invariant per WAL file path.
 * It does not implement cross-process file locking. If multiple processes
 * may write to the same WAL path concurrently, callers MUST serialize
 * access externally (e.g. a single long-lived process, or an OS-level
 * advisory lock such as `flock` wrapped around `WriteAheadLog` usage).
 * Concurrent multi-process appends without such serialization can race on
 * `sequence_number` assignment and corrupt the hash chain.
 */
class WriteAheadLog {
    filePath;
    constructor(filePath) {
        this.filePath = filePath;
    }
    /** Load and fully validate the WAL, returning its records in sequence order. */
    load() {
        if (!fs.existsSync(this.filePath)) {
            return [];
        }
        const raw = fs.readFileSync(this.filePath, "utf8");
        if (raw.length === 0) {
            return [];
        }
        // Reject a torn/incomplete trailing record: a well-formed WAL always
        // ends with a newline after its last complete JSON line.
        if (!raw.endsWith("\n")) {
            throw new errors_1.WalCorruptionError("WAL file does not end with a newline; trailing record appears torn/incomplete.");
        }
        const lines = raw.split("\n").filter((line) => line.length > 0);
        const records = [];
        let previousHash = models_1.GENESIS_HASH;
        let expectedSequence = 1;
        const seenFindingIds = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let parsed;
            try {
                parsed = JSON.parse(line);
            }
            catch (err) {
                throw new errors_1.WalCorruptionError(`WAL record at line ${i + 1} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
            }
            const record = validateRecordShape(parsed, i + 1);
            if (typeof record.sequence_number !== "number" || !Number.isInteger(record.sequence_number)) {
                throw new errors_1.WalCorruptionError(`WAL record at line ${i + 1} has a non-integer sequence_number.`);
            }
            if (record.sequence_number !== expectedSequence) {
                throw new errors_1.WalCorruptionError(`WAL sequence discontinuity at line ${i + 1}: expected sequence_number ` +
                    `${expectedSequence}, found ${record.sequence_number}.`);
            }
            if (record.previous_hash !== previousHash) {
                throw new errors_1.WalCorruptionError(`WAL previous_hash mismatch at line ${i + 1}: expected '${previousHash}', ` +
                    `found '${record.previous_hash}'.`);
            }
            const expectedRecordHash = computeRecordHash(record.sequence_number, record.previous_hash, record.finding);
            if (record.record_hash !== expectedRecordHash) {
                throw new errors_1.WalCorruptionError(`WAL record_hash mismatch at line ${i + 1}: hash chain integrity violated.`);
            }
            const priorFinding = seenFindingIds.get(record.finding.finding_id);
            if (priorFinding !== undefined) {
                const priorSerialized = (0, canonicalizer_1.canonicalJsonStringify)(priorFinding);
                const currentSerialized = (0, canonicalizer_1.canonicalJsonStringify)(record.finding);
                if (priorSerialized !== currentSerialized) {
                    throw new errors_1.TamperDetectedError(`Finding '${record.finding.finding_id}' appears more than once in the WAL with ` +
                        `differing content — possible tamper.`);
                }
                throw new errors_1.WalCorruptionError(`Duplicate finding_id '${record.finding.finding_id}' at line ${i + 1}; findings must ` +
                    `be unique in the WAL.`);
            }
            seenFindingIds.set(record.finding.finding_id, record.finding);
            records.push(record);
            previousHash = record.record_hash;
            expectedSequence += 1;
        }
        return records;
    }
    /**
     * Append a finding if and only if its finding_id is not already present.
     * If the same finding_id exists with DIFFERENT content, throws
     * TamperDetectedError rather than silently overwriting history.
     * Returns whether a new record was appended.
     */
    appendFindingIdempotent(finding) {
        const existingRecords = this.load();
        const existing = existingRecords.find((r) => r.finding.finding_id === finding.finding_id);
        if (existing !== undefined) {
            const existingSerialized = (0, canonicalizer_1.canonicalJsonStringify)(existing.finding);
            const incomingSerialized = (0, canonicalizer_1.canonicalJsonStringify)(finding);
            if (existingSerialized !== incomingSerialized) {
                throw new errors_1.TamperDetectedError(`Finding '${finding.finding_id}' already exists in the WAL with different content.`);
            }
            return false; // already durably recorded, identical — no-op.
        }
        const lastRecord = existingRecords[existingRecords.length - 1];
        const previousHash = lastRecord !== undefined ? lastRecord.record_hash : models_1.GENESIS_HASH;
        const sequenceNumber = lastRecord !== undefined ? lastRecord.sequence_number + 1 : 1;
        const recordHash = computeRecordHash(sequenceNumber, previousHash, finding);
        const record = {
            sequence_number: sequenceNumber,
            previous_hash: previousHash,
            record_hash: recordHash,
            finding,
        };
        this.appendRecordDurably(record);
        return true;
    }
    appendRecordDurably(record) {
        const line = JSON.stringify(record) + "\n";
        const fd = fs.openSync(this.filePath, "a");
        try {
            fs.writeSync(fd, line, null, "utf8");
            fs.fsyncSync(fd);
        }
        finally {
            fs.closeSync(fd);
        }
    }
}
exports.WriteAheadLog = WriteAheadLog;
function validateRecordShape(value, lineNumber) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new errors_1.WalCorruptionError(`WAL record at line ${lineNumber} is not an object.`);
    }
    const obj = value;
    const requiredKeys = ["sequence_number", "previous_hash", "record_hash", "finding"];
    for (const key of requiredKeys) {
        if (!(key in obj)) {
            throw new errors_1.WalCorruptionError(`WAL record at line ${lineNumber} is missing required field '${key}'.`);
        }
    }
    if (typeof obj.previous_hash !== "string" || typeof obj.record_hash !== "string") {
        throw new errors_1.WalCorruptionError(`WAL record at line ${lineNumber} has non-string hash field(s).`);
    }
    const finding = obj.finding;
    if (finding === null || typeof finding !== "object" || Array.isArray(finding)) {
        throw new errors_1.WalCorruptionError(`WAL record at line ${lineNumber} has a malformed finding.`);
    }
    const findingObj = finding;
    const findingRequiredKeys = [
        "finding_id",
        "target_artifact_id",
        "requirement_id",
        "criterion_id",
        "result_state",
        "rationale",
        "predicate_hash",
        "sufficiency_hash",
        "evidence_refs",
        "evaluator_version",
        "semantics_version",
        "canonicalization_policy_hash",
    ];
    for (const key of findingRequiredKeys) {
        if (!(key in findingObj)) {
            throw new errors_1.WalCorruptionError(`WAL record at line ${lineNumber} has a finding missing required field '${key}'.`);
        }
    }
    return obj;
}
