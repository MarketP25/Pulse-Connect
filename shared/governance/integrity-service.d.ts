import { AuditLogEntry } from "./index";
import { Transform, TransformCallback } from "node:stream";
export interface VerificationResult {
    isValid: boolean;
    failedEntryId?: string;
    reason?: string;
}
/**
 * Node.js Transform Stream for memory-efficient audit chain verification.
 * Processes logs one-by-one to handle planetary-scale datasets.
 */
export declare class AuditVerificationStream extends Transform {
    private readonly marpPublicKey;
    private lastProcessedHash;
    constructor(marpPublicKey: string, initialHash?: string);
    _transform(entry: AuditLogEntry, encoding: string, callback: TransformCallback): void;
}
/**
 * Background service to verify the integrity of a hash-chained audit trail.
 * This ensures non-repudiation and detects any retrospective tampering.
 */
export declare class AuditIntegrityService {
    private readonly marpPublicKey;
    constructor(marpPublicKey: string);
    /**
     * Verifies a sequence of audit logs.
     * @param entries An array of entries sorted by timestamp ascending.
     */
    verifyChain(entries: AuditLogEntry[]): Promise<VerificationResult>;
}
