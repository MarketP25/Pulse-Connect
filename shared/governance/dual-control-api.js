"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveDualControl = void 0;
const crypto_utils_1 = require("./crypto-utils");
/**
 * Mock function to verify if the approver has Founder/Superadmin privileges
 * and if the PC365 token is valid.
 */
async function verifyFounderCredential(approverId, token) {
    // In production, check against IAM/DB and validate MFA/Hardware token
    return approverId.startsWith("FOUNDER_") && token.length > 10;
}
/**
 * POST /api/governance/dual-control/approve
 * Verifies a founder token and returns a cryptographic attestation.
 */
const approveDualControl = async (req, res) => {
    const { decisionId, approverId, pc365Token } = req.body;
    const MARP_PRIVATE_KEY = process.env.MARP_PRIVATE_KEY || "default_key";
    try {
        const isValid = await verifyFounderCredential(approverId, pc365Token);
        if (!isValid) {
            return res.status(403).json({
                error: "Unauthorized",
                message: "Invalid Founder credentials or PC365 token."
            });
        }
        // Generate a unique attestation payload
        const attestationPayload = JSON.stringify({
            decisionId,
            approverId,
            timestamp: Date.now(),
            status: "APPROVED"
        });
        // Sign the attestation so it can be verified by the governanceGuard middleware
        // Note: signHash expects the hash of the payload, not the raw payload string.
        const attestation = (0, crypto_utils_1.signHash)(hashData(JSON.parse(attestationPayload)), MARP_PRIVATE_KEY);
        return res.status(200).json({
            message: "Dual-control approval granted.",
            attestationPayload, // Return the raw payload for verification
            attestation // This is the signature
        });
    }
    catch (error) {
        console.error("Dual-control approval error:", error);
        return res.status(500).json({ error: "Internal server error during approval." });
    }
};
exports.approveDualControl = approveDualControl;
