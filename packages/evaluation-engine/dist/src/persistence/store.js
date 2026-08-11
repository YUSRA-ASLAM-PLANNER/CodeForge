"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindingStore = void 0;
const wal_1 = require("./wal");
/**
 * Thin persistence facade over the WAL. Kept separate from `WriteAheadLog`
 * itself so the evaluation pipeline depends on a small, stable interface
 * rather than WAL internals.
 */
class FindingStore {
    wal;
    constructor(walFilePath) {
        this.wal = new wal_1.WriteAheadLog(walFilePath);
    }
    /** Validate and load all previously persisted, hash-chain-verified findings. */
    loadAll() {
        return this.wal.load();
    }
    /**
     * Persist a finding idempotently. Returns `true` if a new WAL record was
     * appended, `false` if an identical finding already existed.
     */
    persist(finding) {
        return this.wal.appendFindingIdempotent(finding);
    }
}
exports.FindingStore = FindingStore;
