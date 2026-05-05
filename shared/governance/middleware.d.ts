import { Request, Response, NextFunction } from "express";
import { GovernanceDecision } from "./index";
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
export declare const governanceGuard: (subsystem: string) => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
