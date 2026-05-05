import Redis from "ioredis";
import { GovernanceStatus } from "./index";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const STATUS_KEY = "pulsco:governance:status";
const STATUS_CHANNEL = "pulsco:governance:status_updates";

const redis = new Redis(REDIS_URL);
const pub = new Redis(REDIS_URL);
const sub = new Redis(REDIS_URL);

/**
 * Exposes the primary Redis client instance for direct operations (e.g., health checks).
 */
export function getRedisClient(): Redis {
  return redis;
}

let currentGovernanceStatus: GovernanceStatus = "ACTIVE";

// Startup synchronization: Fetch the current state from Redis immediately
redis.get(STATUS_KEY).then((val) => {
  if (val) currentGovernanceStatus = val as GovernanceStatus;
});

// Real-time propagation: Listen for status changes published by other nodes
sub.subscribe(STATUS_CHANNEL);
sub.on("message", (channel, message) => {
  if (channel === STATUS_CHANNEL) {
    currentGovernanceStatus = message as GovernanceStatus;
  }
});

/**
 * Retrieves the current global governance status.
 * Performance: O(1) synchronous read from local memory.
 */
export function getGlobalGovernanceStatus(): GovernanceStatus {
  return currentGovernanceStatus;
}

/**
 * Sets the global governance status.
 */
export async function setGlobalGovernanceStatus(status: GovernanceStatus): Promise<void> {
  await redis.set(STATUS_KEY, status);
  await pub.publish(STATUS_CHANNEL, status);
  console.warn(`[GLOBAL GOVERNANCE] Status synchronized to ${status} via Redis Pub/Sub.`);
}
