import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { FeeService } from "./fee.service";

export interface ListingSubscription {
  id: string;
  seller_id: string;
  tier_name: string;
  max_listings: number;
  weekly_fee_usd: number;
  period_start: Date;
  period_end: Date;
  status: "active" | "expired" | "cancelled";
  created_at: Date;
  updated_at: Date;
}

export interface SubscriptionCharge {
  id: string;
  subscription_id: string;
  amount_usd: number;
  policy_version: string;
  trace_id: string;
  charged_at: Date;
  status: "pending" | "completed" | "failed";
}

export class SubscriptionService {
  constructor(
    private pool: Pool,
    private feeService: FeeService
  ) {}

  async createSubscription(
    sellerId: string,
    tierName: string,
    traceId: string
  ): Promise<ListingSubscription> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current fee policy
      const policy = await this.feeService.getCurrentPolicy();

      // Find the requested tier
      const tier = policy.tiers.find((t: any) => t.name === tierName);
      if (!tier) {
        throw new Error(`Tier '${tierName}' not found in current policy`);
      }

      // Check if seller already has an active subscription
      const existingSub = await client.query(
        `
        SELECT id FROM listings_subscriptions
        WHERE seller_id = $1 AND status = 'active'
      `,
        [sellerId]
      );

      if (existingSub.rows.length > 0) {
        throw new Error("Seller already has an active subscription");
      }

      // Calculate period (weekly)
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 7); // 7 days

      // Create subscription
      const subscriptionId = uuidv4();
      const result = await client.query(
        `
        INSERT INTO listings_subscriptions (
          id, seller_id, tier_name, max_listings, weekly_fee_usd,
          period_start, period_end, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `,
        [
          subscriptionId,
          sellerId,
          tier.name,
          tier.max_listings,
          tier.weekly_fee_usd,
          periodStart.toISOString(),
          periodEnd.toISOString(),
          "active"
        ]
      );

      await client.query("COMMIT");
      return this.mapSubscriptionRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getSubscription(subscriptionId: string): Promise<ListingSubscription | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM listings_subscriptions WHERE id = $1
    `,
      [subscriptionId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSubscriptionRow(result.rows[0]);
  }

  async getSellerActiveSubscription(sellerId: string): Promise<ListingSubscription | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM listings_subscriptions
      WHERE seller_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [sellerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapSubscriptionRow(result.rows[0]);
  }

  async chargeWeeklyFees(): Promise<SubscriptionCharge[]> {
    const client = await this.pool.connect();
    const charges: SubscriptionCharge[] = [];

    try {
      await client.query("BEGIN");

      // Find all active subscriptions that need charging (weekly)
      const subscriptionsToCharge = await client.query(`
        SELECT ls.*, sc.last_charge_date
        FROM listings_subscriptions ls
        LEFT JOIN (
          SELECT subscription_id, MAX(charged_at) as last_charge_date
          FROM subscription_charges
          WHERE status = 'completed'
          GROUP BY subscription_id
        ) sc ON sc.subscription_id = ls.id
        WHERE ls.status = 'active'
        AND (
          sc.last_charge_date IS NULL
          OR sc.last_charge_date < NOW() - INTERVAL '7 days'
        )
      `);

      for (const subRow of subscriptionsToCharge.rows) {
        const subscription = this.mapSubscriptionRow(subRow);
        const traceId = uuidv4();

        try {
          // Create charge record
          const chargeId = uuidv4();
          const policy = await this.feeService.getCurrentPolicy();

          await client.query(
            `
            INSERT INTO subscription_charges (
              id, subscription_id, amount_usd, policy_version, trace_id, charged_at, status
            ) VALUES ($1, $2, $3, $4, $5, NOW(), 'completed')
          `,
            [chargeId, subscription.id, subscription.weekly_fee_usd, policy.version, traceId]
          );

          // Create ledger entries for the charge
          await this.createLedgerEntriesForCharge(
            client,
            chargeId,
            subscription.weekly_fee_usd,
            policy.version,
            traceId
          );

          charges.push({
            id: chargeId,
            subscription_id: subscription.id,
            amount_usd: subscription.weekly_fee_usd,
            policy_version: policy.version,
            trace_id: traceId,
            charged_at: new Date(),
            status: "completed"
          });
        } catch (error) {
          console.error(`Failed to charge subscription ${subscription.id}:`, error);
          // Continue with other subscriptions
        }
      }

      await client.query("COMMIT");
      return charges;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async renewSubscription(subscriptionId: string, traceId: string): Promise<ListingSubscription> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Get current subscription
      const currentSub = await client.query(
        `
        SELECT * FROM listings_subscriptions WHERE id = $1 AND status = 'active'
      `,
        [subscriptionId]
      );

      if (currentSub.rows.length === 0) {
        throw new Error("Active subscription not found");
      }

      const subscription = this.mapSubscriptionRow(currentSub.rows[0]);

      // Calculate new period
      const newPeriodStart = new Date(subscription.period_end);
      const newPeriodEnd = new Date(newPeriodStart);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 7); // Extend by 7 days

      // Update subscription period
      const result = await client.query(
        `
        UPDATE listings_subscriptions
        SET period_start = $1, period_end = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
        [newPeriodStart.toISOString(), newPeriodEnd.toISOString(), subscriptionId]
      );

      await client.query("COMMIT");
      return this.mapSubscriptionRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async cancelSubscription(subscriptionId: string, sellerId: string): Promise<ListingSubscription> {
    const result = await this.pool.query(
      `
      UPDATE listings_subscriptions
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND seller_id = $2 AND status = 'active'
      RETURNING *
    `,
      [subscriptionId, sellerId]
    );

    if (result.rows.length === 0) {
      throw new Error("Active subscription not found or access denied");
    }

    return this.mapSubscriptionRow(result.rows[0]);
  }

  async expireSubscriptions(): Promise<number> {
    const result = await this.pool.query(`
      UPDATE listings_subscriptions
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'active' AND period_end < NOW()
    `);

    return result.rowCount || 0;
  }

  private async createLedgerEntriesForCharge(
    client: any,
    chargeId: string,
    amountUsd: number,
    policyVersion: string,
    traceId: string
  ): Promise<void> {
    // Debit seller account
    await client.query(
      `
      INSERT INTO ledger_entries (
        id, transaction_id, account_type, direction, amount_usd, balance_after_usd,
        policy_version, trace_id
      ) VALUES (
        gen_random_uuid(), $1, 'seller', 'debit', $2,
        COALESCE((SELECT balance_after_usd FROM ledger_entries WHERE account_type = 'seller' ORDER BY created_at DESC LIMIT 1), 0) - $2,
        $3, $4
      )
    `,
      [chargeId, amountUsd, policyVersion, traceId]
    );

    // Credit platform account
    await client.query(
      `
      INSERT INTO ledger_entries (
        id, transaction_id, account_type, direction, amount_usd, balance_after_usd,
        policy_version, trace_id
      ) VALUES (
        gen_random_uuid(), $1, 'platform', 'credit', $2,
        COALESCE((SELECT balance_after_usd FROM ledger_entries WHERE account_type = 'platform' ORDER BY created_at DESC LIMIT 1), 0) + $2,
        $3, $4
      )
    `,
      [chargeId, amountUsd, policyVersion, traceId]
    );
  }

  private mapSubscriptionRow(row: any): ListingSubscription {
    return {
      id: row.id,
      seller_id: row.seller_id,
      tier_name: row.tier_name,
      max_listings: parseInt(row.max_listings),
      weekly_fee_usd: parseFloat(row.weekly_fee_usd),
      period_start: new Date(row.period_start),
      period_end: new Date(row.period_end),
      status: row.status,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}
