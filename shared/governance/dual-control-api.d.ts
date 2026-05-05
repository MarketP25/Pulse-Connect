import { Request, Response } from "express";
/**
 * POST /api/governance/dual-control/approve
 * Verifies a founder token and returns a cryptographic attestation.
 */
export declare const approveDualControl: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
