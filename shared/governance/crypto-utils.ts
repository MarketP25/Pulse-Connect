import { createHash, createSign, createVerify } from "node:crypto";
import { AuditLogEntry } from "./index";

/**
 * Calculates the hash for an AuditLogEntry to ensure chain integrity.
 * Considers payload, metadata, actor, and the previous link in the chain.
 */
export function calculateEntryHash(
  entry: Pick<AuditLogEntry, "payload" | "timestamp" | "actor" | "previousHash">
): string {
  // Use a stable string representation for the hash input
  const dataToHash = JSON.stringify({
    payload: entry.payload,
    timestamp: entry.timestamp,
    actor: entry.actor,
    previousHash: entry.previousHash
  });

  return createHash("sha256").update(dataToHash).digest("hex");
}

/**
 * Calculates the SHA256 hash of any given data.
 */
export function hashData(data: any): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

/**
 * Cryptographically signs the hash using a private key (MARP Core Authority).
 */
export function signHash(hash: string, privateKey: string): string {
  return createSign("SHA256").update(hash).end().sign(privateKey, "hex");
}

/**
 * Verifies the signature of a hash using the MARP Core public key.
 */
export function verifySignature(hash: string, signature: string, publicKey: string): boolean {
  return createVerify("SHA256").update(hash).end().verify(publicKey, signature, "hex");
}
