/**
 * Hash Chaining Utility for Immutable Ledgers
 *
 * Implements SHA-256 hash chaining for audit trails and ledger integrity.
 * Ensures data immutability and tamper detection.
 */
export declare class HashChain {
    /**
     * Generates SHA-256 hash of input data
     * @param data - Data to hash
     * @returns Hex string hash
     */
    static hash(data: string): string;
    /**
     * Creates canonical JSON representation for consistent hashing
     * @param obj - Object to canonicalize
     * @returns Canonical JSON string
     */
    static canonicalize(obj: any): string;
    /**
     * Computes current hash from previous hash and row data
     * @param prevHash - Previous hash in chain
     * @param rowData - Current row data (without hash fields)
     * @returns Current hash
     */
    static computeHash(prevHash: string | undefined, rowData: any): string;
    /**
     * Validates hash chain integrity
     * @param records - Array of records with hash fields
     * @returns true if chain is valid
     */
    static validateChain(records: Array<{
        prev_hash?: string;
        curr_hash?: string;
        [key: string]: any;
    }>): boolean;
    /**
     * Generates hash for audit log entry
     * @param prevHash - Previous audit hash
     * @param auditData - Audit data without hash fields
     * @returns Hash for audit entry
     */
    static auditHash(prevHash: string | undefined, auditData: any): string;
}
//# sourceMappingURL=hashChain.d.ts.map