import { AuditLogEntry } from "./index";
import { calculateEntryHash, verifySignature } from "./crypto-utils";
import { Transform, TransformCallback } from "node:stream";
import { getGlobalGovernanceStatus } from "./global-governance-state"; // Import global state

export interface VerificationResult {
  isValid: boolean;
  failedEntryId?: string;
  reason?: string;
}

/**
 * Node.js Transform Stream for memory-efficient audit chain verification.
 * Processes logs one-by-one to handle planetary-scale datasets.
 */
export class AuditVerificationStream extends Transform {
  private lastProcessedHash: string | null = null;

  constructor(
    private readonly marpPublicKey: string,
    initialHash?: string
  ) {
    super({ objectMode: true });
    this.lastProcessedHash = initialHash ?? null;
  }

  _transform(entry: AuditLogEntry, encoding: string, callback: TransformCallback): void {
    // Check for EMERGENCY_FREEZE state
    if (getGlobalGovernanceStatus() === "EMERGENCY_FREEZE") {
      console.warn("[AuditVerificationStream] Halting processing due to EMERGENCY_FREEZE state.");
      // Emit an error to stop the pipeline gracefully
      return callback(new Error("Audit stream processing halted due to EMERGENCY_FREEZE."));
    }
    try {
      // 1. Verify Internal Hash (Data Integrity)
      const computedHash = calculateEntryHash(entry);
      if (entry.hash !== computedHash) {
        return callback(new Error(`Data tampering at ${entry.id}: Hash mismatch.`));
      }

      // 2. Verify MARP Signature (Authenticity)
      const isAuthentic = verifySignature(entry.hash, entry.signature, this.marpPublicKey);
      if (!isAuthentic) {
        return callback(new Error(`Unauthorized entry at ${entry.id}: Signature invalid.`));
      }

      // 3. Verify Chain Link (Continuity)
      if (this.lastProcessedHash && entry.previousHash !== this.lastProcessedHash) {
        return callback(new Error(`Chain broken at ${entry.id}: Previous hash link invalid.`));
      }

      this.lastProcessedHash = entry.hash;

      // Push verified entry forward in the pipeline
      this.push(entry);
      callback();
    } catch (err) {
      callback(err instanceof Error ? err : new Error("Unknown verification error"));
    }
  }
}

/**
 * Background service to verify the integrity of a hash-chained audit trail.
 * This ensures non-repudiation and detects any retrospective tampering.
 */
export class AuditIntegrityService {
  constructor(private readonly marpPublicKey: string) {}

  /**
   * Verifies a sequence of audit logs.
   * @param entries An array of entries sorted by timestamp ascending.
   */
  public async verifyChain(entries: AuditLogEntry[]): Promise<VerificationResult> {
    for (let i = 0; i < entries.length; i++) {
      const current = entries[i];

      // 1. Verify Internal Hash (Data Integrity)
      const computedHash = calculateEntryHash(current);
      if (current.hash !== computedHash) {
        return {
          isValid: false,
          failedEntryId: current.id,
          reason: "Hash mismatch: Data tampering detected."
        };
      }

      // 2. Verify MARP Signature (Authenticity)
      const isAuthentic = verifySignature(current.hash, current.signature, this.marpPublicKey);
      if (!isAuthentic) {
        return {
          isValid: false,
          failedEntryId: current.id,
          reason: "Signature invalid: Unauthorized entry."
        };
      }

      // 3. Verify Chain Link (Continuity)
      if (i > 0) {
        const previous = entries[i - 1];

        if (current.previousHash !== previous.hash) {
          return {
            isValid: false,
            failedEntryId: current.id,
            reason: "Chain break: Previous hash reference is incorrect."
          };
        }
      }
    }

    return { isValid: true };
  }
}
