#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { validateSchema } from "./validation/schemaValidator";
import { validateDomain } from "./validation/validator";
import { evaluateAll } from "./evaluation/evaluator";
import { FindingStore } from "./persistence/store";
import { DEFAULT_CANONICALIZATION_POLICY } from "./canonicalization/policy";
import { isCodeForgeError, toCodeForgeError, SchemaValidationError } from "./errors";
import type { ConformanceFinding } from "./domain/models";

export interface RunResult {
  readonly findings: readonly ConformanceFinding[];
  readonly newlyPersistedCount: number;
  readonly alreadyPersistedCount: number;
}

/**
 * Execute the full Chapter 14 production pipeline (Section 25):
 *   read -> parse -> schema validation -> domain validation ->
 *   referential integrity -> (canonicalization happens lazily per-evidence
 *   during evaluation) -> load & validate WAL -> evaluate
 *   (applicability -> sufficiency -> predicate) -> construct findings ->
 *   idempotently persist -> deterministic result.
 */
export function runPipeline(inputPath: string, walPath: string): RunResult {
  const raw = fs.readFileSync(inputPath, "utf8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SchemaValidationError(
      `Input at '${inputPath}' is not valid JSON: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  const context = validateSchema(parsed);
  validateDomain(context);

  const store = new FindingStore(walPath);
  // Loading validates the existing WAL's hash chain and structure up front,
  // so any prior corruption is surfaced before new work is attempted.
  store.loadAll();

  const findings = evaluateAll({
    context,
    canonicalizationPolicy: DEFAULT_CANONICALIZATION_POLICY,
  });

  let newlyPersistedCount = 0;
  let alreadyPersistedCount = 0;
  for (const finding of findings) {
    const appended = store.persist(finding);
    if (appended) {
      newlyPersistedCount += 1;
    } else {
      alreadyPersistedCount += 1;
    }
  }

  return { findings, newlyPersistedCount, alreadyPersistedCount };
}

function main(): void {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    // eslint-disable-next-line no-console
    console.error("Usage: ch14 <input.json> [wal.jsonl]");
    process.exitCode = 2;
    return;
  }

  const inputPath = path.resolve(args[0] as string);
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
  } catch (err) {
    const cfError = toCodeForgeError(err);
    // eslint-disable-next-line no-console
    console.error(JSON.stringify(cfError.toJSON(), null, 2));
    process.exitCode = 1;
  }
}

function summarizeByState(
  findings: readonly ConformanceFinding[]
): Record<string, number> {
  const summary: Record<string, number> = {};
  for (const finding of findings) {
    summary[finding.result_state] = (summary[finding.result_state] ?? 0) + 1;
  }
  return summary;
}

if (require.main === module) {
  main();
}

export { isCodeForgeError };
