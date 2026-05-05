"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEntryHash = calculateEntryHash;
exports.hashData = hashData;
exports.signHash = signHash;
exports.verifySignature = verifySignature;
const node_crypto_1 = require("node:crypto");
/**
 * Calculates the hash for an AuditLogEntry to ensure chain integrity.
 * Considers payload, metadata, actor, and the previous link in the chain.
 */
function calculateEntryHash(entry) {
    // Use a stable string representation for the hash input
    const dataToHash = JSON.stringify({
        payload: entry.payload,
        timestamp: entry.timestamp,
        actor: entry.actor,
        previousHash: entry.previousHash
    });
    return (0, node_crypto_1.createHash)("sha256").update(dataToHash).digest("hex");
}
/**
 * Calculates the SHA256 hash of any given data.
 */
function hashData(data) {
    return (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(data)).digest("hex");
}
/**
 * Cryptographically signs the hash using a private key (MARP Core Authority).
 */
function signHash(hash, privateKey) {
    return (0, node_crypto_1.createSign)("SHA256").update(hash).end().sign(privateKey, "hex");
}
/**
 * Verifies the signature of a hash using the MARP Core public key.
 */
function verifySignature(hash, signature, publicKey) {
    return (0, node_crypto_1.createVerify)("SHA256").update(hash).end().verify(publicKey, signature, "hex");
}
