import Redis from "ioredis";
import { GovernanceStatus } from "./index";
/**
 * Exposes the primary Redis client instance for direct operations (e.g., health checks).
 */
export declare function getRedisClient(): Redis;
/**
 * Retrieves the current global governance status.
 * Performance: O(1) synchronous read from local memory.
 */
export declare function getGlobalGovernanceStatus(): GovernanceStatus;
/**
 * Sets the global governance status.
 */
export declare function setGlobalGovernanceStatus(status: GovernanceStatus): Promise<void>;
