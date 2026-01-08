"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashChain = void 0;
const crypto_1 = require("crypto");
/**
 * Hash Chaining Utility for Immutable Ledgers
 *
 * Implements SHA-256 hash chaining for audit trails and ledger integrity.
 * Ensures data immutability and tamper detection.
 */
class HashChain {
    /**
     * Generates SHA-256 hash of input data
     * @param data - Data to hash
     * @returns Hex string hash
     */
    static hash(data) {
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    /**
     * Creates canonical JSON representation for consistent hashing
     * @param obj - Object to canonicalize
     * @returns Canonical JSON string
     */
    static canonicalize(obj) {
        return JSON.stringify(obj, Object.keys(obj).sort());
    }
    /**
     * Computes current hash from previous hash and row data
     * @param prevHash - Previous hash in chain
     * @param rowData - Current row data (without hash fields)
     * @returns Current hash
     */
    static computeHash(prevHash, rowData) {
        const canonicalData = this.canonicalize(rowData);
        const chainData = prevHash ? `${prevHash}:${canonicalData}` : canonicalData;
        return this.hash(chainData);
    }
    /**
     * Validates hash chain integrity
     * @param records - Array of records with hash fields
     * @returns true if chain is valid
     */
    static validateChain(records) {
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const { prev_hash, curr_hash, ...data } = record;
            const expectedHash = this.computeHash(prev_hash, data);
            if (expectedHash !== curr_hash) {
                return false;
            }
        }
        return true;
    }
    /**
     * Generates hash for audit log entry
     * @param prevHash - Previous audit hash
     * @param auditData - Audit data without hash fields
     * @returns Hash for audit entry
     */
    static auditHash(prevHash, auditData) {
        // Include timestamp in audit hash for uniqueness
        const dataWithTimestamp = {
            ...auditData,
            timestamp: new Date().toISOString(),
        };
        return this.computeHash(prevHash, dataWithTimestamp);
    }
}
exports.HashChain = HashChain;
//# sourceMappingURL=hashChain.js.map