import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  ConsentRecord,
  ConsentRequest,
  MarketingChannel,
  MarketingPurpose,
  ConsentScope,
  ConsentSource,
  ConsentError
} from "../types/pap";
import { ConsentEntity } from "../entities/consent.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @InjectRepository(ConsentEntity)
    private readonly consentRepository: Repository<ConsentEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Grant consent for marketing activities
   */
  async grantConsent(request: ConsentRequest): Promise<ConsentRecord> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for existing consent
      const existingConsent = await queryRunner.manager.findOne(ConsentEntity, {
        where: {
          userId: request.userId,
          channel: request.channel,
          purpose: request.purpose,
          revokedAt: null
        }
      });

      if (existingConsent) {
        // Update existing consent
        existingConsent.scope = [...new Set([...existingConsent.scope, ...request.scope])];
        existingConsent.expiresAt = request.expiresAt || existingConsent.expiresAt;
        existingConsent.updatedAt = new Date();

        const updatedConsent = await queryRunner.manager.save(ConsentEntity, existingConsent);
        await queryRunner.commitTransaction();

        this.eventEmitter.emit("consent.updated", { consent: updatedConsent });
        return this.mapEntityToConsent(updatedConsent);
      }

      // Create new consent
      const consentEntity = this.consentRepository.create({
        userId: request.userId,
        channel: request.channel,
        purpose: request.purpose,
        scope: request.scope,
        grantedAt: new Date(),
        expiresAt: request.expiresAt,
        source: request.source,
        metadata: request.metadata || {},
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedConsent = await queryRunner.manager.save(ConsentEntity, consentEntity);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("consent.granted", { consent: savedConsent });
      return this.mapEntityToConsent(savedConsent);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to grant consent: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Revoke consent for marketing activities
   */
  async revokeConsent(
    userId: string,
    channel?: MarketingChannel,
    purpose?: MarketingPurpose,
    scope?: ConsentScope[]
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const query = this.consentRepository
        .createQueryBuilder("consent")
        .update(ConsentEntity)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date()
        })
        .where("userId = :userId", { userId })
        .andWhere("revokedAt IS NULL");

      if (channel) {
        query.andWhere("channel = :channel", { channel });
      }

      if (purpose) {
        query.andWhere("purpose = :purpose", { purpose });
      }

      if (scope && scope.length > 0) {
        // Revoke only specific scopes - this is complex, may need to create new records
        // For simplicity, we'll revoke the entire consent
        query.andWhere("scope && :scope", { scope });
      }

      const result = await query.execute();

      if (result.affected && result.affected > 0) {
        await queryRunner.commitTransaction();
        this.eventEmitter.emit("consent.revoked", {
          userId,
          channel,
          purpose,
          scope,
          revokedCount: result.affected
        });
      } else {
        await queryRunner.rollbackTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to revoke consent: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if user has given consent for specific marketing activity
   */
  async checkConsent(
    userId: string,
    channel: MarketingChannel,
    purpose: MarketingPurpose,
    scope: ConsentScope[] = []
  ): Promise<boolean> {
    const consent = await this.consentRepository.findOne({
      where: {
        userId,
        channel,
        purpose,
        revokedAt: null
      }
    });

    if (!consent) {
      return false;
    }

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    // Check if required scope is granted
    if (scope.length > 0) {
      const hasRequiredScope = scope.every((s) => consent.scope.includes(s));
      if (!hasRequiredScope) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all consents for a user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const consents = await this.consentRepository.find({
      where: { userId },
      order: { createdAt: "DESC" }
    });

    return consents.map((c) => this.mapEntityToConsent(c));
  }

  /**
   * Get consent statistics
   */
  async getConsentStats(): Promise<{
    totalConsents: number;
    activeConsents: number;
    revokedConsents: number;
    consentsByChannel: Record<MarketingChannel, number>;
    consentsByPurpose: Record<MarketingPurpose, number>;
  }> {
    const [totalConsents, activeConsents, revokedConsents] = await Promise.all([
      this.consentRepository.count(),
      this.consentRepository.count({ where: { revokedAt: null } }),
      this.consentRepository.count({ where: { revokedAt: { $ne: null } } })
    ]);

    // Get breakdown by channel
    const channelStats = await this.consentRepository
      .createQueryBuilder("consent")
      .select("consent.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .where("consent.revokedAt IS NULL")
      .groupBy("consent.channel")
      .getRawMany();

    const consentsByChannel = channelStats.reduce(
      (acc, stat) => {
        acc[stat.channel] = parseInt(stat.count);
        return acc;
      },
      {} as Record<MarketingChannel, number>
    );

    // Get breakdown by purpose
    const purposeStats = await this.consentRepository
      .createQueryBuilder("consent")
      .select("consent.purpose", "purpose")
      .addSelect("COUNT(*)", "count")
      .where("consent.revokedAt IS NULL")
      .groupBy("consent.purpose")
      .getRawMany();

    const consentsByPurpose = purposeStats.reduce(
      (acc, stat) => {
        acc[stat.purpose] = parseInt(stat.count);
        return acc;
      },
      {} as Record<MarketingPurpose, number>
    );

    return {
      totalConsents,
      activeConsents,
      revokedConsents,
      consentsByChannel,
      consentsByPurpose
    };
  }

  /**
   * Validate consent request
   */
  validateConsentRequest(request: ConsentRequest): void {
    if (!request.userId) {
      throw new ConsentError("User ID is required");
    }

    if (!request.channel) {
      throw new ConsentError("Marketing channel is required");
    }

    if (!request.purpose) {
      throw new ConsentError("Marketing purpose is required");
    }

    if (!request.scope || request.scope.length === 0) {
      throw new ConsentError("Consent scope is required");
    }

    if (!request.source) {
      throw new ConsentError("Consent source is required");
    }

    // Validate scope values
    const validScopes: ConsentScope[] = [
      "contact_info",
      "location_data",
      "behavioral_data",
      "purchase_history",
      "communication_preferences"
    ];

    const invalidScopes = request.scope.filter((s) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new ConsentError(`Invalid consent scopes: ${invalidScopes.join(", ")}`);
    }
  }

  /**
   * Clean up expired consents
   */
  async cleanupExpiredConsents(): Promise<number> {
    const result = await this.consentRepository
      .createQueryBuilder()
      .update(ConsentEntity)
      .set({
        revokedAt: new Date(),
        updatedAt: new Date()
      })
      .where("expiresAt < :now", { now: new Date() })
      .andWhere("revokedAt IS NULL")
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired consents`);
      this.eventEmitter.emit("consent.expired_cleanup", { count: result.affected });
    }

    return result.affected || 0;
  }

  /**
   * Export user consent data for GDPR compliance
   */
  async exportUserConsentData(userId: string): Promise<{
    consents: ConsentRecord[];
    exportDate: Date;
    dataRetention: string;
  }> {
    const consents = await this.getUserConsents(userId);

    return {
      consents,
      exportDate: new Date(),
      dataRetention: "7 years from consent revocation"
    };
  }

  /**
   * Delete all user consent data for GDPR right to erasure
   */
  async deleteUserConsentData(userId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.delete(ConsentEntity, { userId });
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("consent.data_deleted", { userId });
      this.logger.log(`Deleted all consent data for user ${userId}`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to delete consent data for user ${userId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private mapEntityToConsent(entity: ConsentEntity): ConsentRecord {
    return {
      id: entity.id,
      userId: entity.userId,
      channel: entity.channel,
      purpose: entity.purpose,
      scope: entity.scope,
      grantedAt: entity.grantedAt,
      expiresAt: entity.expiresAt,
      revokedAt: entity.revokedAt,
      source: entity.source,
      metadata: entity.metadata
    };
  }
}
