"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisHealthCheck = void 0;
const global_governance_state_1 = require("./global-governance-state"); // Assuming getRedisClient is exposed
/**
 * GET /api/health/governance-redis
 * Reports the current status of the Redis connection used for global governance state.
 */
const redisHealthCheck = async (req, res) => {
    try {
        const redisClient = (0, global_governance_state_1.getRedisClient)(); // Get the Redis client instance
        const pong = await redisClient.ping();
        if (pong === "PONG") {
            return res.status(200).json({
                status: "UP",
                service: "Redis Governance",
                message: "Redis connection is healthy."
            });
        }
        else {
            return res.status(500).json({
                status: "DOWN",
                service: "Redis Governance",
                message: "Redis ping failed.",
                details: pong
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            status: "DOWN",
            service: "Redis Governance",
            message: "Redis connection error.",
            details: error.message
        });
    }
};
exports.redisHealthCheck = redisHealthCheck;
