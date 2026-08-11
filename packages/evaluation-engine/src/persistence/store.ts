import type { ConformanceFinding, WalLogRecord } from "../domain/models";
import { WriteAheadLog } from "./wal";

/**
 * Thin persistence facade over the WAL. Kept separate from `WriteAheadLog`
 * itself so the evaluation pipeline depends on a small, stable interface
 * rather than WAL internals.
 */
export class FindingStore {
  private readonly wal: WriteAheadLog;

  constructor(walFilePath: string) {
    this.wal = new WriteAheadLog(walFilePath);
  }

  /** Validate and load all previously persisted, hash-chain-verified findings. */
  loadAll(): WalLogRecord[] {
    return this.wal.load();
  }

  /**
   * Persist a finding idempotently. Returns `true` if a new WAL record was
   * appended, `false` if an identical finding already existed.
   */
  persist(finding: ConformanceFinding): boolean {
    return this.wal.appendFindingIdempotent(finding);
  }
}
