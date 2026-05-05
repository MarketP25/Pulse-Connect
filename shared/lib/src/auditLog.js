"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const node_crypto_1 = require("node:crypto");
/**
 * MARP Governance Immutable Audit Logger
 * Implements hash-chaining to ensure tamper-evidence.
 */
class AuditLogger {
    /**
     * Generates a hash for a new entry based on the previous hash.
     */
    static calculateHash(data) {
        // Deterministic serialization to ensure hashes match across different systems
        const deterministicStringify = (val) => {
            if (val === null || typeof val !== "object")
                return JSON.stringify(val);
            if (val instanceof Date)
                return JSON.stringify(val.toISOString());
            if (Array.isArray(val))
                return "[" + val.map(deterministicStringify).join(",") + "]";
            return ("{" +
                Object.keys(val)
                    .sort()
                    .map((k) => `${JSON.stringify(k)}:${deterministicStringify(val[k])}`)
                    .join(",") +
                "}");
        };
        // PERFORMANCE NOTE: Current implementation uses JSON for transparency.
        // For planetary scale (millions of TPS), this will evolve to Protobuf
        // to reduce CPU cycles spent on stringification and hashing.
        return (0, node_crypto_1.createHash)(this.ALGORITHM).update(deterministicStringify(data)).digest("hex");
    }
    /**
     * Creates a new chained audit entry.
     */
    static createEntry(action, actor, payload, lastEntryHash = "0".repeat(64), // Genesis block fallback
    shardId) {
        const entry = {
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
    static verifyEntry(entry) {
        const { hash, ...data } = entry;
        const recalculated = this.calculateHash(data);
        return recalculated === hash;
    }
    /**
     * Validates a sequence of audit entries to ensure the chain is unbroken.
     * Returns true only if every block is valid and correctly linked.
     */
    static verifyChain(entries) {
        if (entries.length === 0)
            return true;
        for (let i = 0; i < entries.length; i++) {
            const current = entries[i];
            // 1. Verify individual block integrity
            if (!this.verifyEntry(current))
                return false;
            // 2. Verify linkage to previous block
            if (i > 0) {
                const previous = entries[i - 1];
                if (current.previousHash !== previous.hash)
                    return false;
            }
        }
        return true;
    }
    /**
     * Verifies that a service audit entry correctly references a valid billing ledger entry.
     * This ensures the "Marketing Agent" or "Ecommerce Service" acted under financial authority.
     */
    static verifyBillingLink(entry, ledgerEntry) {
        const payload = entry.payload || {};
        const linkedId = payload.billingTransactionId;
        if (!linkedId || linkedId !== ledgerEntry.id)
            return false;
        if (ledgerEntry.status !== "COMPLETED" && ledgerEntry.status !== "SUCCESS")
            return false;
        // Additional deep-match logic (e.g., amount verification) can be added here
        return true;
    }
}
exports.AuditLogger = AuditLogger;
AuditLogger.ALGORITHM = "sha256";
