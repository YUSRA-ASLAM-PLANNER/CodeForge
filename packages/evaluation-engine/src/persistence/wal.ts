import * as fs from "fs";
import type { ConformanceFinding, JsonValue, WalLogRecord } from "../domain/models";
import { GENESIS_HASH } from "../domain/models";
import { canonicalJsonStringify } from "../canonicalization/canonicalizer";
import { sha256Hex } from "../hash";
import { WalCorruptionError, TamperDetectedError } from "../errors";

/**
 * Deterministic record hash per Section 20:
 *   SHA-256(sequence_number + ":" + previous_hash + ":" + canonical finding JSON)
 */
export function computeRecordHash(
  sequenceNumber: number,
  previousHash: string,
  finding: ConformanceFinding
): string {
  const canonicalFinding = canonicalJsonStringify(finding as unknown as JsonValue);
  return sha256Hex(`${sequenceNumber}:${previousHash}:${canonicalFinding}`);
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
export class WriteAheadLog {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /** Load and fully validate the WAL, returning its records in sequence order. */
  load(): WalLogRecord[] {
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
      throw new WalCorruptionError(
        "WAL file does not end with a newline; trailing record appears torn/incomplete."
      );
    }

    const lines = raw.split("\n").filter((line) => line.length > 0);
    const records: WalLogRecord[] = [];
    let previousHash: string = GENESIS_HASH;
    let expectedSequence = 1;
    const seenFindingIds = new Map<string, ConformanceFinding>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] as string;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch (err) {
        throw new WalCorruptionError(
          `WAL record at line ${i + 1} is not valid JSON: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
      }

      const record = validateRecordShape(parsed, i + 1);

      if (typeof record.sequence_number !== "number" || !Number.isInteger(record.sequence_number)) {
        throw new WalCorruptionError(
          `WAL record at line ${i + 1} has a non-integer sequence_number.`
        );
      }
      if (record.sequence_number !== expectedSequence) {
        throw new WalCorruptionError(
          `WAL sequence discontinuity at line ${i + 1}: expected sequence_number ` +
            `${expectedSequence}, found ${record.sequence_number}.`
        );
      }
      if (record.previous_hash !== previousHash) {
        throw new WalCorruptionError(
          `WAL previous_hash mismatch at line ${i + 1}: expected '${previousHash}', ` +
            `found '${record.previous_hash}'.`
        );
      }

      const expectedRecordHash = computeRecordHash(
        record.sequence_number,
        record.previous_hash,
        record.finding
      );
      if (record.record_hash !== expectedRecordHash) {
        throw new WalCorruptionError(
          `WAL record_hash mismatch at line ${i + 1}: hash chain integrity violated.`
        );
      }

      const priorFinding = seenFindingIds.get(record.finding.finding_id);
      if (priorFinding !== undefined) {
        const priorSerialized = canonicalJsonStringify(priorFinding as unknown as JsonValue);
        const currentSerialized = canonicalJsonStringify(record.finding as unknown as JsonValue);
        if (priorSerialized !== currentSerialized) {
          throw new TamperDetectedError(
            `Finding '${record.finding.finding_id}' appears more than once in the WAL with ` +
              `differing content — possible tamper.`
          );
        }
        throw new WalCorruptionError(
          `Duplicate finding_id '${record.finding.finding_id}' at line ${i + 1}; findings must ` +
            `be unique in the WAL.`
        );
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
  appendFindingIdempotent(finding: ConformanceFinding): boolean {
    const existingRecords = this.load();
    const existing = existingRecords.find((r) => r.finding.finding_id === finding.finding_id);

    if (existing !== undefined) {
      const existingSerialized = canonicalJsonStringify(existing.finding as unknown as JsonValue);
      const incomingSerialized = canonicalJsonStringify(finding as unknown as JsonValue);
      if (existingSerialized !== incomingSerialized) {
        throw new TamperDetectedError(
          `Finding '${finding.finding_id}' already exists in the WAL with different content.`
        );
      }
      return false; // already durably recorded, identical — no-op.
    }

    const lastRecord = existingRecords[existingRecords.length - 1];
    const previousHash = lastRecord !== undefined ? lastRecord.record_hash : GENESIS_HASH;
    const sequenceNumber =
      lastRecord !== undefined ? lastRecord.sequence_number + 1 : 1;
    const recordHash = computeRecordHash(sequenceNumber, previousHash, finding);

    const record: WalLogRecord = {
      sequence_number: sequenceNumber,
      previous_hash: previousHash,
      record_hash: recordHash,
      finding,
    };

    this.appendRecordDurably(record);
    return true;
  }

  private appendRecordDurably(record: WalLogRecord): void {
    const line = JSON.stringify(record) + "\n";
    const fd = fs.openSync(this.filePath, "a");
    try {
      fs.writeSync(fd, line, null, "utf8");
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  }
}

function validateRecordShape(value: unknown, lineNumber: number): WalLogRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new WalCorruptionError(`WAL record at line ${lineNumber} is not an object.`);
  }
  const obj = value as Record<string, unknown>;
  const requiredKeys = ["sequence_number", "previous_hash", "record_hash", "finding"];
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new WalCorruptionError(
        `WAL record at line ${lineNumber} is missing required field '${key}'.`
      );
    }
  }
  if (typeof obj.previous_hash !== "string" || typeof obj.record_hash !== "string") {
    throw new WalCorruptionError(
      `WAL record at line ${lineNumber} has non-string hash field(s).`
    );
  }
  const finding = obj.finding;
  if (finding === null || typeof finding !== "object" || Array.isArray(finding)) {
    throw new WalCorruptionError(`WAL record at line ${lineNumber} has a malformed finding.`);
  }
  const findingObj = finding as Record<string, unknown>;
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
      throw new WalCorruptionError(
        `WAL record at line ${lineNumber} has a finding missing required field '${key}'.`
      );
    }
  }

  return obj as unknown as WalLogRecord;
}
