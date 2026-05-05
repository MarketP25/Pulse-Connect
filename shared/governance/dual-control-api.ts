import { Request, Response } from "express";
import { signHash } from "./crypto-utils";

/**
 * Mock function to verify if the approver has Founder/Superadmin privileges
 * and if the PC365 token is valid.
 */
async function verifyFounderCredential(approverId: string, token: string): Promise<boolean> {
  // In production, check against IAM/DB and validate MFA/Hardware token
  return approverId.startsWith("FOUNDER_") && token.length > 10;
}

/**
 * POST /api/governance/dual-control/approve
 * Verifies a founder token and returns a cryptographic attestation.
 */
export const approveDualControl = async (req: Request, res: Response) => {
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
    const attestation = signHash(hashData(JSON.parse(attestationPayload)), MARP_PRIVATE_KEY);

    return res.status(200).json({
      message: "Dual-control approval granted.",
      attestationPayload, // Return the raw payload for verification
      attestation // This is the signature
    });
  } catch (error) {
    console.error("Dual-control approval error:", error);
    return res.status(500).json({ error: "Internal server error during approval." });
  }
};
