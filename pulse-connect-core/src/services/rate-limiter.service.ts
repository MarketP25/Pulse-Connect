import { Injectable, Inject, Logger } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger("RateLimiter");

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  /**
   * Checks if an action is allowed within a sliding window.
   * @param key Unique identifier for the rate limit (e.g., userId or action:userId)
   * @param limit Max allowed attempts in the window
   * @param windowSeconds Duration of the sliding window in seconds
   */
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; count: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    const pipeline = this.redis.multi();

    // 1. Remove timestamps outside the current sliding window
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    // 2. Add current attempt timestamp
    pipeline.zadd(redisKey, now, now.toString());
    // 3. Count remaining valid attempts in the set
    pipeline.zcard(redisKey);
    // 4. Set expiration to automatically clean up the set
    pipeline.expire(redisKey, windowSeconds);

    const results = await pipeline.exec();

    // results[2][1] is the result of ZCARD
    const currentCount = (results?.[2]?.[1] as number) || 0;

    return {
      allowed: currentCount <= limit,
      count: currentCount
    };
  }

  /**
   * Checks security thresholds for both a specific user and their network IP.
   */
  async checkSecurityThresholds(userId: string, ip: string) {
    const userLimit = await this.checkLimit(`user:${userId}`, 3, 600);
    const ipLimit = await this.checkLimit(`ip:${ip}`, 50, 3600);
    return { userLimit, ipLimit };
  }
}
