import { Request, Response } from "express";
/**
 * GET /api/health/governance-redis
 * Reports the current status of the Redis connection used for global governance state.
 */
export declare const redisHealthCheck: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
