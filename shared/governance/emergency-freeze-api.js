"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleEmergencyFreeze = void 0;
const global_governance_state_1 = require("./global-governance-state");
const crypto_utils_1 = require("./crypto-utils");
/**
 * POST /api/governance/emergency-freeze
 * Highly privileged endpoint to toggle the platform's global state.
 *
 * Security: Requires Level 3 (Founder) PC365 Attestation.
 */
const toggleEmergencyFreeze = async (req, res) => {
    const { status, pc365Attestation, pc365Payload } = req.body;
    const MARP_PUBLIC_KEY = process.env.MARP_PUBLIC_KEY || "";
    // 1. Validate status input
    if (status !== "ACTIVE" && status !== "EMERGENCY_FREEZE") {
        return res
            .status(400)
            .json({ error: "Invalid status requested. Must be ACTIVE or EMERGENCY_FREEZE." });
    }
    // Verify that the attestation is valid and contains the FOUNDER role
    const payloadHash = (0, crypto_utils_1.hashData)(JSON.parse(pc365Payload));
    const isAuthorized = (0, crypto_utils_1.verifySignature)(payloadHash, pc365Attestation, MARP_PUBLIC_KEY);
    const parsedPayload = JSON.parse(pc365Payload);
    if (!isAuthorized || parsedPayload.role !== "FOUNDER") {
        return res.status(403).json({
            error: "Unauthorized",
            message: "Signature verification failed or insufficient privileges."
        });
    }
    try {
        const previousStatus = (0, global_governance_state_1.getGlobalGovernanceStatus)();
        await (0, global_governance_state_1.setGlobalGovernanceStatus)(status);
        return res.status(200).json({
            message: `Platform status successfully updated to ${status}.`,
            previous: previousStatus,
            current: status,
            timestamp: Date.now()
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Internal server error during state transition." });
    }
};
exports.toggleEmergencyFreeze = toggleEmergencyFreeze;
