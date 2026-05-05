"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.getGlobalGovernanceStatus = getGlobalGovernanceStatus;
exports.setGlobalGovernanceStatus = setGlobalGovernanceStatus;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const STATUS_KEY = "pulsco:governance:status";
const STATUS_CHANNEL = "pulsco:governance:status_updates";
const redis = new ioredis_1.default(REDIS_URL);
const pub = new ioredis_1.default(REDIS_URL);
const sub = new ioredis_1.default(REDIS_URL);
/**
 * Exposes the primary Redis client instance for direct operations (e.g., health checks).
 */
function getRedisClient() {
    return redis;
}
let currentGovernanceStatus = "ACTIVE";
// Startup synchronization: Fetch the current state from Redis immediately
redis.get(STATUS_KEY).then((val) => {
    if (val)
        currentGovernanceStatus = val;
});
// Real-time propagation: Listen for status changes published by other nodes
sub.subscribe(STATUS_CHANNEL);
sub.on("message", (channel, message) => {
    if (channel === STATUS_CHANNEL) {
        currentGovernanceStatus = message;
    }
});
/**
 * Retrieves the current global governance status.
 * Performance: O(1) synchronous read from local memory.
 */
function getGlobalGovernanceStatus() {
    return currentGovernanceStatus;
}
/**
 * Sets the global governance status.
 */
async function setGlobalGovernanceStatus(status) {
    await redis.set(STATUS_KEY, status);
    await pub.publish(STATUS_CHANNEL, status);
    console.warn(`[GLOBAL GOVERNANCE] Status synchronized to ${status} via Redis Pub/Sub.`);
}
