"use strict";
/**
 * Typed error hierarchy for the Chapter 14 evaluation engine.
 *
 * Every error carries a deterministic, machine-readable `code`.
 * Expected validation/integrity failures must NEVER be classified
 * as ERR_EVALUATOR_CRASH — that code is reserved for genuinely
 * unexpected internal exceptions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvaluatorCrashError = exports.TamperDetectedError = exports.WalCorruptionError = exports.IntegrityMismatchError = exports.ReferentialIntegrityError = exports.ValidationError = exports.SchemaValidationError = exports.CodeForgeError = void 0;
exports.isCodeForgeError = isCodeForgeError;
exports.toCodeForgeError = toCodeForgeError;
class CodeForgeError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
    toJSON() {
        return { code: this.code, name: this.name, message: this.message };
    }
}
exports.CodeForgeError = CodeForgeError;
/** Structural / schema-level validation failure (AJV or domain schema). */
class SchemaValidationError extends CodeForgeError {
    code = "ERR_SCHEMA_VALIDATION";
}
exports.SchemaValidationError = SchemaValidationError;
/** Domain-level validation failure not caught by JSON Schema alone. */
class ValidationError extends CodeForgeError {
    code = "ERR_VALIDATION_ERROR";
}
exports.ValidationError = ValidationError;
/** Duplicate IDs, unknown references, orphan traceability endpoints, cycles. */
class ReferentialIntegrityError extends CodeForgeError {
    code = "ERR_REFERENTIAL_INTEGRITY";
}
exports.ReferentialIntegrityError = ReferentialIntegrityError;
/** Evidence integrity_identifier does not match recomputed hash. */
class IntegrityMismatchError extends CodeForgeError {
    code = "ERR_INTEGRITY_MISMATCH";
}
exports.IntegrityMismatchError = IntegrityMismatchError;
/** WAL is malformed, corrupted, or its hash chain is broken. */
class WalCorruptionError extends CodeForgeError {
    code = "ERR_WAL_CORRUPTION";
}
exports.WalCorruptionError = WalCorruptionError;
/** Same finding_id observed with different content (tamper or logic bug). */
class TamperDetectedError extends CodeForgeError {
    code = "ERR_TAMPER_DETECTED";
}
exports.TamperDetectedError = TamperDetectedError;
/** Unexpected internal exception — never used for expected validation paths. */
class EvaluatorCrashError extends CodeForgeError {
    code = "ERR_EVALUATOR_CRASH";
}
exports.EvaluatorCrashError = EvaluatorCrashError;
function isCodeForgeError(err) {
    return err instanceof CodeForgeError;
}
/** Wrap an unknown thrown value as a deterministic, classified error. */
function toCodeForgeError(err) {
    if (isCodeForgeError(err))
        return err;
    const message = err instanceof Error ? err.message : String(err);
    return new EvaluatorCrashError(message);
}
