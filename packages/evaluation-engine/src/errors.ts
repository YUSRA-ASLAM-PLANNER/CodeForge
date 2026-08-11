/**
 * Typed error hierarchy for the Chapter 14 evaluation engine.
 *
 * Every error carries a deterministic, machine-readable `code`.
 * Expected validation/integrity failures must NEVER be classified
 * as ERR_EVALUATOR_CRASH — that code is reserved for genuinely
 * unexpected internal exceptions.
 */

export abstract class CodeForgeError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { code: string; name: string; message: string } {
    return { code: this.code, name: this.name, message: this.message };
  }
}

/** Structural / schema-level validation failure (AJV or domain schema). */
export class SchemaValidationError extends CodeForgeError {
  readonly code = "ERR_SCHEMA_VALIDATION" as const;
}

/** Domain-level validation failure not caught by JSON Schema alone. */
export class ValidationError extends CodeForgeError {
  readonly code = "ERR_VALIDATION_ERROR" as const;
}

/** Duplicate IDs, unknown references, orphan traceability endpoints, cycles. */
export class ReferentialIntegrityError extends CodeForgeError {
  readonly code = "ERR_REFERENTIAL_INTEGRITY" as const;
}

/** Evidence integrity_identifier does not match recomputed hash. */
export class IntegrityMismatchError extends CodeForgeError {
  readonly code = "ERR_INTEGRITY_MISMATCH" as const;
}

/** WAL is malformed, corrupted, or its hash chain is broken. */
export class WalCorruptionError extends CodeForgeError {
  readonly code = "ERR_WAL_CORRUPTION" as const;
}

/** Same finding_id observed with different content (tamper or logic bug). */
export class TamperDetectedError extends CodeForgeError {
  readonly code = "ERR_TAMPER_DETECTED" as const;
}

/** Unexpected internal exception — never used for expected validation paths. */
export class EvaluatorCrashError extends CodeForgeError {
  readonly code = "ERR_EVALUATOR_CRASH" as const;
}

export function isCodeForgeError(err: unknown): err is CodeForgeError {
  return err instanceof CodeForgeError;
}

/** Wrap an unknown thrown value as a deterministic, classified error. */
export function toCodeForgeError(err: unknown): CodeForgeError {
  if (isCodeForgeError(err)) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new EvaluatorCrashError(message);
}
