import { Request, Response } from "express";
import { setGlobalGovernanceStatus, getGlobalGovernanceStatus } from "./global-governance-state";
import { GovernanceStatus } from "./index";
import { verifySignature, hashData } from "./crypto-utils";

/**
 * POST /api/governance/emergency-freeze
 * Highly privileged endpoint to toggle the platform's global state.
 *
 * Security: Requires Level 3 (Founder) PC365 Attestation.
 */
export const toggleEmergencyFreeze = async (req: Request, res: Response) => {
  const { status, pc365Attestation, pc365Payload } = req.body;
  const MARP_PUBLIC_KEY = process.env.MARP_PUBLIC_KEY || "";

  // 1. Validate status input
  if (status !== "ACTIVE" && status !== "EMERGENCY_FREEZE") {
    return res

      .status(400)
      .json({ error: "Invalid status requested. Must be ACTIVE or EMERGENCY_FREEZE." });
  }

  // Verify that the attestation is valid and contains the FOUNDER role
  const payloadHash = hashData(JSON.parse(pc365Payload));
  const isAuthorized = verifySignature(payloadHash, pc365Attestation, MARP_PUBLIC_KEY);
  const parsedPayload = JSON.parse(pc365Payload);

  if (!isAuthorized || parsedPayload.role !== "FOUNDER") {
    return res.status(403).json({
      error: "Unauthorized",
      message: "Signature verification failed or insufficient privileges."
    });
  }

  try {
    const previousStatus = getGlobalGovernanceStatus();
    await setGlobalGovernanceStatus(status as GovernanceStatus);

    return res.status(200).json({
      message: `Platform status successfully updated to ${status}.`,
      previous: previousStatus,
      current: status,
      timestamp: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error during state transition." });
  }
};
