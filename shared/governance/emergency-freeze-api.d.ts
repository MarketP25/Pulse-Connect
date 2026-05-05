import { Request, Response } from "express";
/**
 * POST /api/governance/emergency-freeze
 * Highly privileged endpoint to toggle the platform's global state.
 *
 * Security: Requires Level 3 (Founder) PC365 Attestation.
 */
export declare const toggleEmergencyFreeze: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
