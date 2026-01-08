import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface CommunicationFeePolicy {
  id: string;
  voice_per_minute_usd: number;
  video_per_minute_usd: number;
  bundles: Array<{
    minutes: number;
    price_usd: number;
    effective_price_per_minute: number;
  }>;
  region_overrides: any;
  effective_from: Date;
  effective_to?: Date;
}

export interface WalletBalance {
  user_id: string;
  available_minutes: number;
  purchased_minutes: number;
  used_minutes: number;
  auto_top_up_enabled: boolean;
  auto_top_up_threshold: number;
  last_top_up_at?: Date;
  region_code: string;
  created_at: Date;
  updated_at: Date;
}

export interface BillingTransaction {
  id: string;
  user_id: string;
  call_id?: string;
  message_id?: string;
  // include top_up for wallet top-ups
  service_type: "voice" | "video" | "message" | "top_up";
  duration_minutes?: number;
  amount_usd: number;
  regional_amount?: number;
  fx_rate?: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  billed_at: Date;
  trace_id: string;
}

export interface TopUpRequest {
  user_id: string;
  minutes_to_add: number;
  payment_method_id: string;
  trace_id: string;
}

export class WalletIntegrationService {
  constructor(
    private pool: Pool,
    private ledgerService: any // Would be the existing LedgerService
  ) {}

  /**
   * Get current communication fee policy
   */
  async getCurrentFeePolicy(): Promise<CommunicationFeePolicy> {
    const result = await this.pool.query(`
      SELECT * FROM communication_fee_policies
      WHERE effective_from <= NOW()
        AND (effective_to IS NULL OR effective_to >= NOW())
      ORDER BY effective_from DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new Error("No active communication fee policy found");
    }

    const row = result.rows[0];
    return {
      id: row.id,
      voice_per_minute_usd: parseFloat(row.voice_per_minute_usd),
      video_per_minute_usd: parseFloat(row.video_per_minute_usd),
      bundles: JSON.parse(row.bundles || "[]"),
      region_overrides: JSON.parse(row.region_overrides || "{}"),
      effective_from: new Date(row.effective_from),
      effective_to: row.effective_to ? new Date(row.effective_to) : undefined
    };
  }

  /**
   * Get user's wallet balance
   */
  async getWalletBalance(userId: string): Promise<WalletBalance | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM communication_wallet_balances WHERE user_id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      user_id: row.user_id,
      available_minutes: parseFloat(row.available_minutes),
      purchased_minutes: parseFloat(row.purchased_minutes),
      used_minutes: parseFloat(row.used_minutes),
      auto_top_up_enabled: row.auto_top_up_enabled,
      auto_top_up_threshold: parseFloat(row.auto_top_up_threshold),
      last_top_up_at: row.last_top_up_at ? new Date(row.last_top_up_at) : undefined,
      region_code: row.region_code,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Initialize wallet for new user
   */
  async initializeWallet(
    userId: string,
    regionCode: string = "US",
    initialMinutes: number = 0
  ): Promise<WalletBalance> {

    await this.pool.query(
      `
      INSERT INTO communication_wallet_balances (
        user_id, available_minutes, purchased_minutes, used_minutes,
        auto_top_up_enabled, auto_top_up_threshold, region_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO NOTHING
    `,
      [userId, initialMinutes, initialMinutes, 0, false, 10, regionCode]
    );

    const balance = await this.getWalletBalance(userId);
    if (!balance) {
      throw new Error("Failed to initialize wallet");
    }

    return balance;
  }

  /**
   * Check if user has sufficient balance for call
   */
  async checkBalanceForCall(
    userId: string,
    callType: "voice" | "video",
    estimatedMinutes: number = 1
  ): Promise<{
    has_balance: boolean;
    available_minutes: number;
    estimated_cost_usd: number;
    can_proceed: boolean;
  }> {
    const balance = await this.getWalletBalance(userId);
    if (!balance) {
      return {
        has_balance: false,
        available_minutes: 0,
        estimated_cost_usd: 0,
        can_proceed: false
      };
    }

    const policy = await this.getCurrentFeePolicy();
    const ratePerMinute =
      callType === "voice" ? policy.voice_per_minute_usd : policy.video_per_minute_usd;
    const estimatedCost = ratePerMinute * estimatedMinutes;

    // Require enough available minutes for the estimated duration
    const canProceed = balance.available_minutes >= estimatedMinutes;

    return {
      has_balance: balance.available_minutes > 0,
      available_minutes: balance.available_minutes,
      estimated_cost_usd: estimatedCost,
      can_proceed: canProceed
    };
  }

  /**
   * Start billing for a call
   */
  async startCallBilling(
    userId: string,
    callId: string,
    callType: "voice" | "video",
    regionCode: string = "US",
    traceId: string
  ): Promise<{
    billing_id: string;
    rate_per_minute_usd: number;
    available_minutes: number;
  }> {
    const policy = await this.getCurrentFeePolicy();
    const ratePerMinute =
      callType === "voice" ? policy.voice_per_minute_usd : policy.video_per_minute_usd;

    // Check balance
    const balanceCheck = await this.checkBalanceForCall(userId, callType);
    if (!balanceCheck.can_proceed) {
      throw new Error("Insufficient balance for call");
    }

    // Create billing transaction
    const billingId = uuidv4();
    await this.pool.query(
      `
      INSERT INTO communication_billing_transactions (
        id, user_id, call_id, service_type, status, trace_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [billingId, userId, callId, callType, "pending", traceId]
    );

    return {
      billing_id: billingId,
      rate_per_minute_usd: ratePerMinute,
      available_minutes: balanceCheck.available_minutes
    };
  }

  /**
   * Update call billing with actual duration
   */
  async finalizeCallBilling(
    billingId: string,
    actualMinutes: number,
    regionCode: string = "US",
    traceId: string
  ): Promise<BillingTransaction> {
    // Get billing transaction
    const billingResult = await this.pool.query(
      `
      SELECT * FROM communication_billing_transactions WHERE id = $1
    `,
      [billingId]
    );

    if (billingResult.rows.length === 0) {
      throw new Error("Billing transaction not found");
    }

    const billing = billingResult.rows[0];
    const policy = await this.getCurrentFeePolicy();

    // Calculate cost
    const ratePerMinute =
      billing.service_type === "voice" ? policy.voice_per_minute_usd : policy.video_per_minute_usd;
    const totalCostUsd = ratePerMinute * actualMinutes;

    // Apply regional pricing
    const regionalPricing = await this.calculateRegionalPricing(totalCostUsd, regionCode);

    // Update billing transaction
    await this.pool.query(
      `
      UPDATE communication_billing_transactions
      SET duration_minutes = $1, amount_usd = $2, regional_amount = $3,
          fx_rate = $4, currency = $5, status = $6, billed_at = NOW(),
          fx_source = $7, fx_rate_timestamp = $8
      WHERE id = $9
    `,
      [
        actualMinutes,
        totalCostUsd,
        regionalPricing.final_amount,
        regionalPricing.fx_rate,
        regionalPricing.currency,
        "completed",
        regionalPricing.fx_source,
        regionalPricing.fx_rate_timestamp,
        billingId
      ]
    );

    // Deduct from wallet
    await this.deductWalletMinutes(billing.user_id, actualMinutes);

    // Record in ledger
    await this.recordLedgerTransaction({
      user_id: billing.user_id,
      amount_usd: totalCostUsd,
      description: `${billing.service_type} call billing`,
      reference_id: billing.call_id,
      trace_id: traceId
    });

    return {
      id: billingId,
      user_id: billing.user_id,
      call_id: billing.call_id,
      service_type: billing.service_type,
      duration_minutes: actualMinutes,
      amount_usd: totalCostUsd,
      regional_amount: regionalPricing.final_amount,
      fx_rate: regionalPricing.fx_rate,
      currency: regionalPricing.currency,
      status: "completed",
      billed_at: new Date(),
      trace_id: traceId
    };
  }

  /**
   * Top up wallet with minutes
   */
  async topUpWallet(request: TopUpRequest): Promise<{
    transaction_id: string;
    minutes_added: number;
    amount_paid_usd: number;
  }> {
    const policy = await this.getCurrentFeePolicy();

    // Find appropriate bundle or calculate per-minute cost
    let costPerMinute = policy.voice_per_minute_usd; // Base rate
    let totalCost = costPerMinute * request.minutes_to_add;

    // Check for bundle pricing
    const bundle = policy.bundles.find((b) => b.minutes === request.minutes_to_add);
    if (bundle) {
      totalCost = bundle.price_usd;
    }

    // Process payment (this would integrate with payment service)
    const paymentResult = await this.processPayment(
      request.user_id,
      request.payment_method_id,
      totalCost,
      request.trace_id
    );

    if (!paymentResult.success) {
      throw new Error("Payment failed");
    }

    // Add minutes to wallet
    await this.pool.query(
      `
      UPDATE communication_wallet_balances
      SET available_minutes = available_minutes + $1,
          purchased_minutes = purchased_minutes + $1,
          last_top_up_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $2
    `,
      [request.minutes_to_add, request.user_id]
    );

    // Record transaction
    const transactionId = uuidv4();
    // Idempotent insert on trace_id: if exists, do nothing
    try {
      await this.pool.query(
        `
        INSERT INTO communication_billing_transactions (
          id, user_id, service_type, amount_usd, status, trace_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [transactionId, request.user_id, "top_up", totalCost, "completed", request.trace_id]
      );
    } catch (e) {
      // If unique constraint on trace_id exists and we hit a conflict, fetch existing
      const existing = await this.pool.query(
        `SELECT id FROM communication_billing_transactions WHERE trace_id = $1 LIMIT 1`,
        [request.trace_id]
      );
      if (existing.rows?.[0]?.id) {
        transactionId = existing.rows[0].id;
      } else {
        throw e;
      }
    }

    // Record in ledger
    await this.recordLedgerTransaction({
      user_id: request.user_id,
      amount_usd: totalCost,
      description: "Communication wallet top-up",
      reference_id: transactionId,
      trace_id: request.trace_id
    });

    return {
      transaction_id: transactionId,
      minutes_added: request.minutes_to_add,
      amount_paid_usd: totalCost
    };
  }

  /**
   * Auto top-up wallet if enabled and below threshold
   */
  async checkAndAutoTopUp(userId: string): Promise<boolean> {
    const balance = await this.getWalletBalance(userId);
    if (!balance || !balance.auto_top_up_enabled) {
      return false;
    }

    if (balance.available_minutes > balance.auto_top_up_threshold) {
      return false; // No need to top up
    }

    // Auto top-up with default amount (100 minutes)
    const defaultTopUpMinutes = 100;
    const policy = await this.getCurrentFeePolicy();

    // Find 100-minute bundle or calculate cost
    const bundle = policy.bundles.find((b) => b.minutes === defaultTopUpMinutes);
    const cost = bundle ? bundle.price_usd : policy.voice_per_minute_usd * defaultTopUpMinutes;

    // This would integrate with saved payment method
    // For now, assume auto top-up succeeds
    await this.pool.query(
      `
      UPDATE communication_wallet_balances
      SET available_minutes = available_minutes + $1,
          purchased_minutes = purchased_minutes + $1,
          last_top_up_at = NOW(),
          updated_at = NOW()
      WHERE user_id = $2
    `,
      [defaultTopUpMinutes, userId]
    );

    return true;
  }

  /**
   * Get billing history for user
   */
  async getBillingHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BillingTransaction[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM communication_billing_transactions
      WHERE user_id = $1
      ORDER BY billed_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      call_id: row.call_id,
      message_id: row.message_id,
      service_type: row.service_type,
      duration_minutes: row.duration_minutes ? parseFloat(row.duration_minutes) : undefined,
      amount_usd: parseFloat(row.amount_usd),
      regional_amount: row.regional_amount ? parseFloat(row.regional_amount) : undefined,
      fx_rate: row.fx_rate ? parseFloat(row.fx_rate) : undefined,
      currency: row.currency,
      status: row.status,
      billed_at: new Date(row.billed_at),
      trace_id: row.trace_id
    }));
  }

  /**
   * Calculate regional pricing with FX conversion
   */
  private async calculateRegionalPricing(
    usdAmount: number,
    regionCode: string
  ): Promise<{
    final_amount: number;
    fx_rate: number;
    currency: string;
    fx_source: string;
    fx_rate_timestamp: string;
  }> {
    // FX provider hook. In production, inject a provider (e.g., OpenExchangeRates, XE)
    // and return authoritative rate with provenance and timestamp.
    const regionalRates: { [key: string]: { rate: number; currency: string; source: string } } = {
      US: { rate: 1.0, currency: "USD", source: "static:us" },
      KE: { rate: 118.0, currency: "KES", source: "static:ke" },
      EU: { rate: 0.926, currency: "EUR", source: "static:eu" }
    };

    const regionData = regionalRates[regionCode] || regionalRates["US"];
    const ts = new Date().toISOString();

    return {
      final_amount: usdAmount * regionData.rate,
      fx_rate: regionData.rate,
      currency: regionData.currency,
      fx_source: regionData.source,
      fx_rate_timestamp: ts
    };
  }

  /**
   * Deduct minutes from wallet
   */
  private async deductWalletMinutes(userId: string, minutes: number): Promise<void> {
    const res = await this.pool.query(
      `
      UPDATE communication_wallet_balances
      SET available_minutes = available_minutes - $1,
          used_minutes = used_minutes + $1,
          updated_at = NOW()
      WHERE user_id = $2 AND available_minutes >= $1
    `,
      [minutes, userId]
    );

    // If no rows were updated, user did not have sufficient balance
    if (res.rowCount === 0) {
      throw new Error("Insufficient balance to deduct minutes");
    }

    // Check if auto top-up is needed
    await this.checkAndAutoTopUp(userId);
  }

  /**
   * Process payment (integrates with payment service)
   */
  private async processPayment(
    userId: string,
    paymentMethodId: string,
    amount: number,
    traceId: string
  ): Promise<{ success: boolean; transaction_id?: string }> {
    // Idempotency: if a prior successful payment exists for this traceId, return it
    const existing = await this.pool.query(
      `SELECT id FROM communication_billing_transactions WHERE trace_id = $1 AND service_type = 'top_up' AND status = 'completed' LIMIT 1`,
      [traceId]
    );
    if (existing.rows?.[0]?.id) {
      return { success: true, transaction_id: existing.rows[0].id };
    }

    // Integrate with payment gateway here (Stripe/Adyen/etc), using traceId as idempotency key
    // For now, simulate success
    return {
      success: true,
      transaction_id: uuidv4()
    };
  }

  /**
   * Record transaction in ledger
   */
  private async recordLedgerTransaction(params: {
    user_id: string;
    amount_usd: number;
    description: string;
    reference_id: string;
    trace_id: string;
  }): Promise<void> {
    // Forward hash-chain and metadata to ledger for audit integrity
    await this.ledgerService.recordTransaction(
      "communication_billing",
      params.reference_id,
      params.amount_usd,
      params.amount_usd,
      params.amount_usd,
      0,
      "v1.0.0",
      params.trace_id,
      {
        actor: params.user_id,
        description: params.description,
        policy_version: "v1.0.0",
        idempotency_key: params.trace_id
      }
    );
  }
}
