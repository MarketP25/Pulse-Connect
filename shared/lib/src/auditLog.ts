import { createHash } from "node:crypto";

export interface AuditLogEntry<T = any> {
  version: string;
  timestamp: string;
  action: string;
  actor: {
    id: string;
    role: string;
  };
  payload: T;
  previousHash: string;
  hash: string;
  shardId?: string; // Essential for planetary scaling
}

/**
 * MARP Governance Immutable Audit Logger
 * Implements hash-chaining to ensure tamper-evidence.
 */
export class AuditLogger {
  private static readonly ALGORITHM = "sha256";

  /**
   * Generates a hash for a new entry based on the previous hash.
   */
  static calculateHash(data: Omit<AuditLogEntry, "hash">): string {
    // Deterministic serialization to ensure hashes match across different systems
    const deterministicStringify = (val: any): string => {
      if (val === null || typeof val !== "object") return JSON.stringify(val);
      if (val instanceof Date) return JSON.stringify(val.toISOString());
      if (Array.isArray(val)) return "[" + val.map(deterministicStringify).join(",") + "]";
      return (
        "{" +
        Object.keys(val)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${deterministicStringify(val[k])}`)
          .join(",") +
        "}"
      );
    };

    // PERFORMANCE NOTE: Current implementation uses JSON for transparency.
    // For planetary scale (millions of TPS), this will evolve to Protobuf
    // to reduce CPU cycles spent on stringification and hashing.
    return createHash(this.ALGORITHM).update(deterministicStringify(data)).digest("hex");
  }

  /**
   * Creates a new chained audit entry.
   */
  static createEntry<T>(
    action: string,
    actor: { id: string; role: string },
    payload: T,
    lastEntryHash: string = "0".repeat(64), // Genesis block fallback
    shardId?: string
  ): AuditLogEntry<T> {
    const entry: Omit<AuditLogEntry<T>, "hash"> = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      action,
      actor,
      payload,
      previousHash: lastEntryHash,
      shardId
    };

    return {
      ...entry,
      hash: this.calculateHash(entry)
    };
  }

  /**
   * Verifies that an entry has not been tampered with relative to the chain.
   */
  static verifyEntry(entry: AuditLogEntry): boolean {
    const { hash, ...data } = entry;
    const recalculated = this.calculateHash(data);
    return recalculated === hash;
  }

  /**
   * Validates a sequence of audit entries to ensure the chain is unbroken.
   * Returns true only if every block is valid and correctly linked.
   */
  static verifyChain(entries: AuditLogEntry[]): boolean {
    if (entries.length === 0) return true;

    for (let i = 0; i < entries.length; i++) {
      const current = entries[i];

      // 1. Verify individual block integrity
      if (!this.verifyEntry(current)) return false;

      // 2. Verify linkage to previous block
      if (i > 0) {
        const previous = entries[i - 1];
        if (current.previousHash !== previous.hash) return false;
      }
    }

    return true;
  }

  /**
   * Verifies that a service audit entry correctly references a valid billing ledger entry.
   * This ensures the "Marketing Agent" or "Ecommerce Service" acted under financial authority.
   */
  static verifyBillingLink(
    entry: AuditLogEntry,
    ledgerEntry: { id: string; status: string; amount?: number; currency?: string }
  ): boolean {
    const payload = entry.payload || {};
    const linkedId = payload.billingTransactionId;

    if (!linkedId || linkedId !== ledgerEntry.id) return false;
    if (ledgerEntry.status !== "COMPLETED" && ledgerEntry.status !== "SUCCESS") return false;

    // Additional deep-match logic (e.g., amount verification) can be added here
    return true;
  }
}
