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
    shardId?: string;
}
/**
 * MARP Governance Immutable Audit Logger
 * Implements hash-chaining to ensure tamper-evidence.
 */
export declare class AuditLogger {
    private static readonly ALGORITHM;
    /**
     * Generates a hash for a new entry based on the previous hash.
     */
    static calculateHash(data: Omit<AuditLogEntry, "hash">): string;
    /**
     * Creates a new chained audit entry.
     */
    static createEntry<T>(action: string, actor: {
        id: string;
        role: string;
    }, payload: T, lastEntryHash?: string, // Genesis block fallback
    shardId?: string): AuditLogEntry<T>;
    /**
     * Verifies that an entry has not been tampered with relative to the chain.
     */
    static verifyEntry(entry: AuditLogEntry): boolean;
    /**
     * Validates a sequence of audit entries to ensure the chain is unbroken.
     * Returns true only if every block is valid and correctly linked.
     */
    static verifyChain(entries: AuditLogEntry[]): boolean;
    /**
     * Verifies that a service audit entry correctly references a valid billing ledger entry.
     * This ensures the "Marketing Agent" or "Ecommerce Service" acted under financial authority.
     */
    static verifyBillingLink(entry: AuditLogEntry, ledgerEntry: {
        id: string;
        status: string;
        amount?: number;
        currency?: string;
    }): boolean;
}
