"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditIntegrityService = exports.AuditVerificationStream = void 0;
const crypto_utils_1 = require("./crypto-utils");
const node_stream_1 = require("node:stream");
const global_governance_state_1 = require("./global-governance-state"); // Import global state
/**
 * Node.js Transform Stream for memory-efficient audit chain verification.
 * Processes logs one-by-one to handle planetary-scale datasets.
 */
class AuditVerificationStream extends node_stream_1.Transform {
    constructor(marpPublicKey, initialHash) {
        super({ objectMode: true });
        this.marpPublicKey = marpPublicKey;
        this.lastProcessedHash = null;
        this.lastProcessedHash = initialHash ?? null;
    }
    _transform(entry, encoding, callback) {
        // Check for EMERGENCY_FREEZE state
        if ((0, global_governance_state_1.getGlobalGovernanceStatus)() === "EMERGENCY_FREEZE") {
            console.warn("[AuditVerificationStream] Halting processing due to EMERGENCY_FREEZE state.");
            // Emit an error to stop the pipeline gracefully
            return callback(new Error("Audit stream processing halted due to EMERGENCY_FREEZE."));
        }
        try {
            // 1. Verify Internal Hash (Data Integrity)
            const computedHash = (0, crypto_utils_1.calculateEntryHash)(entry);
            if (entry.hash !== computedHash) {
                return callback(new Error(`Data tampering at ${entry.id}: Hash mismatch.`));
            }
            // 2. Verify MARP Signature (Authenticity)
            const isAuthentic = (0, crypto_utils_1.verifySignature)(entry.hash, entry.signature, this.marpPublicKey);
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
        }
        catch (err) {
            callback(err instanceof Error ? err : new Error("Unknown verification error"));
        }
    }
}
exports.AuditVerificationStream = AuditVerificationStream;
/**
 * Background service to verify the integrity of a hash-chained audit trail.
 * This ensures non-repudiation and detects any retrospective tampering.
 */
class AuditIntegrityService {
    constructor(marpPublicKey) {
        this.marpPublicKey = marpPublicKey;
    }
    /**
     * Verifies a sequence of audit logs.
     * @param entries An array of entries sorted by timestamp ascending.
     */
    async verifyChain(entries) {
        for (let i = 0; i < entries.length; i++) {
            const current = entries[i];
            // 1. Verify Internal Hash (Data Integrity)
            const computedHash = (0, crypto_utils_1.calculateEntryHash)(current);
            if (current.hash !== computedHash) {
                return {
                    isValid: false,
                    failedEntryId: current.id,
                    reason: "Hash mismatch: Data tampering detected."
                };
            }
            // 2. Verify MARP Signature (Authenticity)
            const isAuthentic = (0, crypto_utils_1.verifySignature)(current.hash, current.signature, this.marpPublicKey);
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
exports.AuditIntegrityService = AuditIntegrityService;
