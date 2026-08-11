import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  authenticateEvidence,
  computeEvidenceIntegrityIdentifier,
} from "../src/canonicalization/evidenceIntegrity";
import { DEFAULT_CANONICALIZATION_POLICY } from "../src/canonicalization/policy";
import { IntegrityMismatchError, WalCorruptionError, TamperDetectedError } from "../src/errors";
import { WriteAheadLog } from "../src/persistence/wal";
import type { ConformanceFinding, ObservedEvidence } from "../src/domain/models";

function tempFile(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ch14-wal-")), "wal.jsonl");
}

function sampleFinding(overrides: Partial<ConformanceFinding> = {}): ConformanceFinding {
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

test("evidence integrity: correct hash authenticates", () => {
  const evidence: ObservedEvidence = {
    evidence_id: "E1",
    artifact_id: "ART-01",
    evidence_class: "Interface",
    payload: { a: 1 },
  };
  const expected = computeEvidenceIntegrityIdentifier(evidence, DEFAULT_CANONICALIZATION_POLICY);
  const withHash: ObservedEvidence = { ...evidence, integrity_identifier: expected };
  const result = authenticateEvidence(withHash, DEFAULT_CANONICALIZATION_POLICY);
  assert.equal(result, expected);
});

test("evidence integrity: incorrect hash is rejected", () => {
  const evidence: ObservedEvidence = {
    evidence_id: "E1",
    artifact_id: "ART-01",
    evidence_class: "Interface",
    payload: { a: 1 },
    integrity_identifier: "0".repeat(64),
  };
  assert.throws(
    () => authenticateEvidence(evidence, DEFAULT_CANONICALIZATION_POLICY),
    IntegrityMismatchError
  );
});

test("WAL: hash verification succeeds for a properly appended chain", () => {
  const wal = new WriteAheadLog(tempFile());
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));
  const records = wal.load();
  assert.equal(records.length, 2);
  assert.equal(records[0]!.sequence_number, 1);
  assert.equal(records[1]!.sequence_number, 2);
});

test("WAL: chain break (tampered record_hash) is detected", () => {
  const file = tempFile();
  const wal = new WriteAheadLog(file);
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));

  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const record = JSON.parse(lines[0]!);
  record.record_hash = "0".repeat(64);
  lines[0] = JSON.stringify(record);
  fs.writeFileSync(file, lines.join("\n") + "\n");

  assert.throws(() => new WriteAheadLog(file).load(), WalCorruptionError);
});

test("WAL: sequence gap is detected", () => {
  const file = tempFile();
  const wal = new WriteAheadLog(file);
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64) }));
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "2".repeat(64) }));

  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  const record = JSON.parse(lines[1]!);
  record.sequence_number = 5;
  lines[1] = JSON.stringify(record);
  fs.writeFileSync(file, lines.join("\n") + "\n");

  assert.throws(() => new WriteAheadLog(file).load(), WalCorruptionError);
});

test("WAL: corrupted JSON line is detected", () => {
  const file = tempFile();
  fs.writeFileSync(file, '{"not valid json\n');
  assert.throws(() => new WriteAheadLog(file).load(), WalCorruptionError);
});

test("WAL: idempotency — appending the same finding twice does not duplicate", () => {
  const file = tempFile();
  const wal = new WriteAheadLog(file);
  const finding = sampleFinding({ finding_id: "1".repeat(64) });
  const first = wal.appendFindingIdempotent(finding);
  const second = wal.appendFindingIdempotent(finding);
  assert.equal(first, true);
  assert.equal(second, false);
  assert.equal(wal.load().length, 1);
});

test("WAL: same finding_id with different content raises tamper error", () => {
  const file = tempFile();
  const wal = new WriteAheadLog(file);
  wal.appendFindingIdempotent(sampleFinding({ finding_id: "1".repeat(64), result_state: "Conforming" }));
  assert.throws(
    () =>
      wal.appendFindingIdempotent(
        sampleFinding({ finding_id: "1".repeat(64), result_state: "Non-Conforming" })
      ),
    TamperDetectedError
  );
});
