import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  PAPSubscription,
  SubscriptionStatus,
  Entitlement,
  EntitlementType,
  SubscriptionRequest,
  EntitlementError
} from "../types/pap";
import { SubscriptionEntity } from "../entities/subscription.entity";

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Create a new subscription with entitlements
   */
  async createSubscription(request: SubscriptionRequest): Promise<PAPSubscription> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for existing active subscription
      const existingSubscription = await queryRunner.manager.findOne(SubscriptionEntity, {
        where: {
          userId: request.userId,
          status: In(["active", "pending"])
        }
      });

      if (existingSubscription) {
        throw new EntitlementError("User already has an active subscription");
      }

      // Create subscription entity
      const subscriptionEntity = this.subscriptionRepository.create({
        userId: request.userId,
        planId: request.planId,
        status: SubscriptionStatus.PENDING,
        entitlements: request.entitlements,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedSubscription = await queryRunner.manager.save(
        SubscriptionEntity,
        subscriptionEntity
      );
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("subscription.created", { subscription: savedSubscription });
      return this.mapEntityToSubscription(savedSubscription);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to create subscription: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Activate a subscription
   */
  async activateSubscription(subscriptionId: string): Promise<PAPSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new EntitlementError("Subscription not found");
    }

    if (subscription.status !== SubscriptionStatus.PENDING) {
      throw new EntitlementError("Subscription cannot be activated from current status");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.activatedAt = new Date();
      subscription.updatedAt = new Date();

      const updatedSubscription = await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("subscription.activated", { subscription: updatedSubscription });
      return this.mapEntityToSubscription(updatedSubscription);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to activate subscription: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if user has entitlement for a specific action
   */
  async checkEntitlement(
    userId: string,
    entitlementType: EntitlementType,
    amount: number = 1
  ): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    if (!subscription) {
      return false;
    }

    // Check if subscription has expired
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return false;
    }

    // Find the entitlement
    const entitlement = subscription.entitlements.find((e) => e.type === entitlementType);
    if (!entitlement) {
      return false;
    }

    // Check if entitlement has remaining capacity
    const remaining = entitlement.limit - entitlement.used;
    return remaining >= amount;
  }

  /**
   * Consume entitlement
   */
  async consumeEntitlement(
    userId: string,
    entitlementType: EntitlementType,
    amount: number = 1
  ): Promise<boolean> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    if (!subscription) {
      throw new EntitlementError("No active subscription found");
    }

    const entitlement = subscription.entitlements.find((e) => e.type === entitlementType);
    if (!entitlement) {
      throw new EntitlementError(`Entitlement ${entitlementType} not found in subscription`);
    }

    const remaining = entitlement.limit - entitlement.used;
    if (remaining < amount) {
      throw new EntitlementError(
        `Insufficient entitlement balance. Required: ${amount}, Available: ${remaining}`
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update entitlement usage
      entitlement.used += amount;

      // Reset usage if period has passed
      if (entitlement.resetPeriod && entitlement.resetDate) {
        const now = new Date();
        if (now >= entitlement.resetDate) {
          entitlement.used = amount; // Reset and consume new amount
          entitlement.resetDate = this.calculateNextResetDate(entitlement.resetPeriod);
        }
      }

      subscription.updatedAt = new Date();

      await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("entitlement.consumed", {
        userId,
        entitlementType,
        amount,
        remaining: entitlement.limit - entitlement.used
      });

      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to consume entitlement: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get user's current entitlements
   */
  async getUserEntitlements(userId: string): Promise<Entitlement[]> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE
      }
    });

    if (!subscription) {
      return [];
    }

    // Reset expired entitlements
    const now = new Date();
    subscription.entitlements.forEach((entitlement) => {
      if (entitlement.resetDate && now >= entitlement.resetDate) {
        entitlement.used = 0;
        entitlement.resetDate = this.calculateNextResetDate(entitlement.resetPeriod!);
      }
    });

    // Save updated reset dates
    if (subscription.entitlements.some((e) => e.resetDate && now >= e.resetDate)) {
      await this.subscriptionRepository.save(subscription);
    }

    return subscription.entitlements;
  }

  /**
   * Get subscription details
   */
  async getSubscription(userId: string): Promise<PAPSubscription | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: In(["active", "pending", "suspended"])
      }
    });

    return subscription ? this.mapEntityToSubscription(subscription) : null;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new EntitlementError("Subscription not found");
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      return; // Already cancelled
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      subscription.updatedAt = new Date();

      await queryRunner.manager.save(SubscriptionEntity, subscription);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit("subscription.cancelled", {
        subscription: this.mapEntityToSubscription(subscription),
        reason
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to cancel subscription: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get entitlement usage statistics
   */
  async getEntitlementStats(): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalEntitlements: Record<EntitlementType, number>;
    usedEntitlements: Record<EntitlementType, number>;
  }> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { status: SubscriptionStatus.ACTIVE }
    });

    const totalEntitlements: Record<EntitlementType, number> = {} as any;
    const usedEntitlements: Record<EntitlementType, number> = {} as any;

    subscriptions.forEach((subscription) => {
      subscription.entitlements.forEach((entitlement) => {
        totalEntitlements[entitlement.type] =
          (totalEntitlements[entitlement.type] || 0) + entitlement.limit;
        usedEntitlements[entitlement.type] =
          (usedEntitlements[entitlement.type] || 0) + entitlement.used;
      });
    });

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: subscriptions.length,
      totalEntitlements,
      usedEntitlements
    };
  }

  /**
   * Calculate next reset date for periodic entitlements
   */
  private calculateNextResetDate(period: "daily" | "weekly" | "monthly"): Date {
    const now = new Date();

    switch (period) {
      case "daily":
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case "weekly":
        const daysUntilNextWeek = 7 - now.getDay();
        return new Date(now.getTime() + daysUntilNextWeek * 24 * 60 * 60 * 1000);
      case "monthly":
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to daily
    }
  }

  private mapEntityToSubscription(entity: SubscriptionEntity): PAPSubscription {
    return {
      id: entity.id,
      userId: entity.userId,
      planId: entity.planId,
      status: entity.status,
      entitlements: entity.entitlements,
      createdAt: entity.createdAt,
      activatedAt: entity.activatedAt,
      cancelledAt: entity.cancelledAt,
      expiresAt: entity.expiresAt
    };
  }
}
