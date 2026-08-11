import { createHash } from "crypto";

/** Deterministic SHA-256 over a UTF-8 string, returned as lowercase hex. */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
