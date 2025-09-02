import { redis } from "../redis";
import { PLAN_TIERS, PlanTier, PlanFeature } from "../plans";
import { logger } from "../logger";
import { AppError, ErrorTypes } from "../errors";

const PLAN_CACHE_PREFIX = "plan:";
const PLAN_CACHE_TTL = 60 * 60; // 1 hour

export class PlanService {
  /**
   * Get a plan by its ID
   */
  static async getPlan(planId: string): Promise<PlanTier | null> {
    try {
      // Try to get from cache first
      const cachedPlan = await redis.get<PlanTier>(`${PLAN_CACHE_PREFIX}${planId}`);
      if (cachedPlan) return cachedPlan;

      // If not in cache, get from constant and cache it
      const plan = PLAN_TIERS.find((p) => p.id === planId);
      if (plan) {
        await redis.set(`${PLAN_CACHE_PREFIX}${planId}`, plan, { ex: PLAN_CACHE_TTL });
      }

      return plan || null;
    } catch (error) {
      logger.error({ error, planId }, "Failed to get plan");
      return PLAN_TIERS.find((p) => p.id === planId) || null;
    }
  }

  /**
   * Check if a feature is available in a plan
   */
  static async hasFeature(planId: string, featureId: string): Promise<boolean> {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new AppError(
          "Plan not found",
          ErrorTypes.NOT_FOUND.code,
          ErrorTypes.NOT_FOUND.statusCode,
          true,
          { planId }
        );
      }

      const feature = plan.features.find((f) => f.id === featureId);
      return feature?.included || false;
    } catch (error) {
      logger.error({ error, planId, featureId }, "Failed to check feature availability");
      return false;
    }
  }

  /**
   * Get feature limit for a plan
   */
  static async getFeatureLimit(planId: string, featureId: string): Promise<number | null> {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new AppError(
          "Plan not found",
          ErrorTypes.NOT_FOUND.code,
          ErrorTypes.NOT_FOUND.statusCode,
          true,
          { planId }
        );
      }

      const feature = plan.features.find((f) => f.id === featureId);
      return feature?.limit || null;
    } catch (error) {
      logger.error({ error, planId, featureId }, "Failed to get feature limit");
      return null;
    }
  }

  /**
   * Compare two plans to determine if it's an upgrade or downgrade
   */
  static async comparePlans(
    currentPlanId: string,
    newPlanId: string
  ): Promise<"upgrade" | "downgrade" | "same"> {
    try {
      const [currentPlan, newPlan] = await Promise.all([
        this.getPlan(currentPlanId),
        this.getPlan(newPlanId)
      ]);

      if (!currentPlan || !newPlan) {
        throw new AppError(
          "One or more plans not found",
          ErrorTypes.NOT_FOUND.code,
          ErrorTypes.NOT_FOUND.statusCode,
          true,
          { currentPlanId, newPlanId }
        );
      }

      if (currentPlan.price === newPlan.price) return "same";
      return newPlan.price > currentPlan.price ? "upgrade" : "downgrade";
    } catch (error) {
      logger.error({ error, currentPlanId, newPlanId }, "Failed to compare plans");
      throw error;
    }
  }

  /**
   * Get all available plans
   */
  static async getAvailablePlans(): Promise<PlanTier[]> {
    return PLAN_TIERS.filter((plan) => !plan.legacy);
  }
}
