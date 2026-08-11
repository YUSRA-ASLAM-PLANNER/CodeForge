import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runPipeline } from "../src/cli";
import { baseContext, clone, mutable } from "./fixtures";
import { SchemaValidationError } from "../src/errors";
import { WalCorruptionError } from "../src/errors";
import type { Chapter14EvaluationContext } from "../src/domain/models";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "ch14-cli-"));
}

function writeInput(ctx: Chapter14EvaluationContext, dir: string): string {
  const p = path.join(dir, "input.json");
  fs.writeFileSync(p, JSON.stringify(ctx));
  return p;
}

test("CLI: complete successful evaluation (Conforming)", () => {
  const dir = tempDir();
  const input = writeInput(baseContext(), dir);
  const wal = path.join(dir, "wal.jsonl");
  const result = runPipeline(input, wal);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]!.result_state, "Conforming");
});

test("CLI: insufficient evidence", () => {
  const dir = tempDir();
  const ctx = mutable(clone(baseContext()));
  ctx.observed_evidence = [];
  const input = writeInput(ctx, dir);
  const wal = path.join(dir, "wal.jsonl");
  const result = runPipeline(input, wal);
  assert.equal(result.findings[0]!.result_state, "Insufficient Evidence");
});

test("CLI: non-conforming", () => {
  const dir = tempDir();
  const ctx = mutable(clone(baseContext()));
  ctx.observed_evidence[0]!.payload = { wrong_attribute: true };
  const input = writeInput(ctx, dir);
  const wal = path.join(dir, "wal.jsonl");
  const result = runPipeline(input, wal);
  assert.equal(result.findings[0]!.result_state, "Non-Conforming");
});

test("CLI: not applicable", () => {
  const dir = tempDir();
  const ctx = mutable(clone(baseContext()));
  ctx.artifacts = [...ctx.artifacts, { artifact_id: "ART-02", artifact_type: "service" }];
  ctx.criteria[0]!.applicability = { artifact_ids: ["ART-02"] };
  const input = writeInput(ctx, dir);
  const wal = path.join(dir, "wal.jsonl");
  const result = runPipeline(input, wal);
  const notApplicable = result.findings.find((f) => f.target_artifact_id === "ART-01");
  assert.equal(notApplicable?.result_state, "Not Applicable");
  assert.equal(notApplicable?.evidence_refs.length, 0);
});

test("CLI: malformed input raises a schema validation error", () => {
  const dir = tempDir();
  const input = path.join(dir, "bad.json");
  fs.writeFileSync(input, "{not valid json");
  const wal = path.join(dir, "wal.jsonl");
  assert.throws(() => runPipeline(input, wal), SchemaValidationError);
});

test("CLI: corrupted WAL is rejected before evaluation proceeds", () => {
  const dir = tempDir();
  const input = writeInput(baseContext(), dir);
  const wal = path.join(dir, "wal.jsonl");
  fs.writeFileSync(wal, '{"sequence_number":1,"previous_hash":"x"}\n');
  assert.throws(() => runPipeline(input, wal), WalCorruptionError);
});

test("CLI: repeated execution is idempotent (no duplicate findings persisted)", () => {
  const dir = tempDir();
  const input = writeInput(baseContext(), dir);
  const wal = path.join(dir, "wal.jsonl");
  const first = runPipeline(input, wal);
  const second = runPipeline(input, wal);
  assert.equal(first.newlyPersistedCount, 1);
  assert.equal(second.newlyPersistedCount, 0);
  assert.equal(second.alreadyPersistedCount, 1);
  assert.equal(first.findings[0]!.finding_id, second.findings[0]!.finding_id);
});
