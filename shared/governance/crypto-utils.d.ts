import { AuditLogEntry } from "./index";
/**
 * Calculates the hash for an AuditLogEntry to ensure chain integrity.
 * Considers payload, metadata, actor, and the previous link in the chain.
 */
export declare function calculateEntryHash(entry: Pick<AuditLogEntry, "payload" | "timestamp" | "actor" | "previousHash">): string;
/**
 * Calculates the SHA256 hash of any given data.
 */
export declare function hashData(data: any): string;
/**
 * Cryptographically signs the hash using a private key (MARP Core Authority).
 */
export declare function signHash(hash: string, privateKey: string): string;
/**
 * Verifies the signature of a hash using the MARP Core public key.
 */
export declare function verifySignature(hash: string, signature: string, publicKey: string): boolean;
