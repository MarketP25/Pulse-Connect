import { Injectable, Logger, Inject } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class DeviceKeyService {
  private readonly logger = new Logger("DeviceKeyService");
  private readonly TOKEN_PREFIX = "kyc_token:";
  private readonly QUARANTINE_PREFIX = "quarantine:";
  private readonly TOKEN_TTL = 300; // 5 minutes in seconds

  // Mock DB storage. In production, this targets the PostgreSQL 'marp_keys' table
  private readonly keyRegistry = new Map<string, string>();

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  /**
   * Issues a short-lived KYC token valid for 5 minutes.
   * Called after successful biometric verification.
   */
  async issueKycToken(userId: string, token: string): Promise<void> {
    const key = `${this.TOKEN_PREFIX}${userId}`;
    await this.redis.set(key, token, "EX", this.TOKEN_TTL);
    this.logger.log(`Issued KYC token for user ${userId} with ${this.TOKEN_TTL}s TTL`);
  }

  async registerKey(userId: string, publicKey: string, kycToken: string) {
    const key = `${this.TOKEN_PREFIX}${userId}`;
    const validToken = await this.redis.get(key);

    if (!validToken || validToken !== kycToken) {
      this.logger.error(`Unauthorized key registration attempt for user: ${userId}`);
      throw new Error("Invalid or expired KYC token");
    }

    this.logger.log(`Registering MARP Device Key for User: ${userId}`);
    this.keyRegistry.set(userId, publicKey);

    // Consume the token immediately (One-Time use)
    await this.redis.del(key);

    return { status: "registered", version: "v1" };
  }

  /**
   * Temporarily disables a user's keys.
   */
  async quarantineUser(userId: string, durationSeconds: number): Promise<void> {
    const key = `${this.QUARANTINE_PREFIX}${userId}`;
    await this.redis.set(key, "true", "EX", durationSeconds);
    this.logger.warn(`User ${userId} quarantined for ${durationSeconds}s`);
  }

  async isQuarantined(userId: string): Promise<boolean> {
    const key = `${this.QUARANTINE_PREFIX}${userId}`;
    const status = await this.redis.get(key);
    return status === "true";
  }

  /**
   * Manually lifts a quarantine for a user.
   */
  async liftQuarantine(userId: string): Promise<void> {
    const key = `${this.QUARANTINE_PREFIX}${userId}`;
    await this.redis.del(key);
    this.logger.log(`Quarantine manually lifted for user: ${userId}`);
  }

  async getKeyForUser(userId: string): Promise<string | null> {
    if (await this.isQuarantined(userId)) {
      this.logger.debug(`Key lookup blocked: User ${userId} is currently quarantined.`);
      return null;
    }
    return this.keyRegistry.get(userId) || null;
  }
}
