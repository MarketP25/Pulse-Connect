import { Request, Response, NextFunction } from "express";
import { GovernanceDecision, GovernanceLevel, GovernanceStatus } from "./index";
import { verifySignature, hashData } from "./crypto-utils"; // Import verifySignature and hashData
import { getGlobalGovernanceStatus } from "./global-governance-state"; // Import global state

/*
 * Extension for Express Request to carry the Governance Decision context.
 */
declare global {
  namespace Express {
    interface Request {
      governance?: GovernanceDecision;
    }
  }
}

/**
 * Express Middleware for the Edge Gateway to evaluate and enforce MARP Governance.
 */
export const governanceGuard = (subsystem: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 1. Global Emergency Freeze Check
    if (getGlobalGovernanceStatus() === "EMERGENCY_FREEZE") {
      return res.status(503).json({
        error: "Service Unavailable",
        message:
          "PULSCO is currently in an EMERGENCY FREEZE state due to critical system events. All non-essential operations are temporarily suspended."
      });
    }

    // 2. Global Degraded State Check (Throttling)
    if (getGlobalGovernanceStatus() === "DEGRADED") {
      // Implement a simple delay for throttling. In a real system, this might be more sophisticated
      // (e.g., dynamic delay based on load, queueing, or returning 429 with Retry-After).
      const throttleDelayMs = parseInt(process.env.DEGRADED_THROTTLE_MS || "500", 10);
      await new Promise((resolve) => setTimeout(resolve, throttleDelayMs));

      console.warn(
        `[GovernanceGuard] Request throttled due to DEGRADED state for ${throttleDelayMs}ms.`
      );
    }

    const MARP_PUBLIC_KEY = process.env.MARP_PUBLIC_KEY || "";

    try {
      // Simulate a call to the MARP Governance Core for real-time policy evaluation
      // In production, this would be an internal gRPC or REST call to the core service.
      const decision = await evaluateMarpPolicy(req, subsystem);

      // Attach the decision to the request for audit logging and downstream verification
      req.governance = decision;

      // Enforce the Governance Action
      switch (decision.action) {
        case "ALLOW":
          return next();

        case "DENY":
          return res.status(403).json({
            error: "Governance Policy Violation",
            rationale: decision.rationale,
            decisionId: decision.decisionId
          });

        case "CHALLENGE_DUAL_CONTROL":
          const { attestation, attestationPayload } = req.body;

          if (!attestation || !attestationPayload) {
            // This is the initial challenge, no attestation provided yet
            return res.status(401).json({
              error: "Dual-Control Required",
              message: "This operation requires Founder (PC365) authorization.",
              decisionId: decision.decisionId
            });
          }

          // Attestation provided, now verify it
          try {
            const parsedPayload = JSON.parse(attestationPayload);
            const payloadHash = hashData(parsedPayload); // Use generic hashData

            const isAttestationValid = verifySignature(payloadHash, attestation, MARP_PUBLIC_KEY);

            if (
              !isAttestationValid ||
              parsedPayload.decisionId !== decision.decisionId ||
              parsedPayload.status !== "APPROVED"
            ) {
              return res.status(403).json({
                error: "Dual-Control Verification Failed",
                message: "Invalid or mismatched attestation.",
                decisionId: decision.decisionId
              });
            }

            // Attestation is valid and approved, proceed with the request
            return next();
          } catch (attestationError) {
            console.error("Error verifying dual-control attestation:", attestationError);
            return res.status(500).json({
              error: "Internal Server Error",
              message: "Failed to verify dual-control attestation."
            });
          }

        default:
          return res.status(500).json({ error: "Unsupported governance action" });
      }
    } catch (err) {
      console.error("Governance Guard encountered an error:", err);
      // Fail-closed: deny access if the governance system is unreachable or an unexpected error occurs
      res
        .status(500)
        .json({ error: "Governance evaluation system unreachable or internal error." });
    }
  };
};
// Implementation placeholder for MARP Policy Evaluation Logic
async function evaluateMarpPolicy(req: Request, subsystem: string): Promise<GovernanceDecision> {
  // This is a placeholder. In a real system, this would involve a call to the MARP Governance Core.
  // For demonstration, it always allows, but a real implementation would return DENY or CHALLENGE_DUAL_CONTROL
  // based on actual policy evaluation.
  return {
    decisionId: `dec_${Date.now()}`,
    action: "ALLOW", // Default to allow for simulation purposes
    level: GovernanceLevel.L1_AUTOMATED, // Default level
    policyId: "DEFAULT_GATEWAY_ACCESS", // Default policy
    policyVersion: "1.0.0", // Default version
    rationale: "Request validated against standard entry-point rules.", // Default rationale
    metadata: {
      correlationId: (req.headers["x-correlation-id"] as string) || "system-init",
      subsystem,
      region: "global-edge",
      timestamp: Date.now()
    },
    parentEventHash: "0x000" // In practice, fetch latest hash from the audit sink
  };
}
