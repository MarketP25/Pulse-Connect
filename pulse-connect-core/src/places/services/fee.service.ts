import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface FeePolicy {
  version: string;
  effective_at: Date;
  posting_fee_percent: number;
  booking_fee_percent: number;
  transaction_fee_percent: number;
  tiers: Array<{
    name: string;
    max_listings: number;
    weekly_fee_usd: number;
  }>;
  region_overrides?: any;
  notes?: string;
  signature_hash: string;
}

export interface FeeCalculation {
  base_amount_usd: number;
  posting_fee_usd: number;
  booking_fee_usd: number;
  total_fee_usd: number;
  policy_version: string;
  trace_id: string;
  fx_rate?: number;
  currency?: string;
}

export class FeeService {
  constructor(private pool: Pool) {}

  /**
   * Get current active fee policy
   */
  async getCurrentPolicy(): Promise<FeePolicy> {
    const result = await this.pool.query(`
      SELECT * FROM fee_policy_registry
      WHERE effective_at <= NOW()
      ORDER BY effective_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      throw new Error("No active fee policy found");
    }

    return this.mapPolicyRow(result.rows[0]);
  }

  /**
   * Get specific policy version
   */
  async getPolicyByVersion(version: string): Promise<FeePolicy | null> {
    const result = await this.pool.query(
      `
      SELECT * FROM fee_policy_registry WHERE version = $1
    `,
      [version]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapPolicyRow(result.rows[0]);
  }

  /**
   * Create new fee policy (admin only)
   */
  async createPolicy(policy: Omit<FeePolicy, "signature_hash">): Promise<FeePolicy> {
    const signature_hash = this.generateSignatureHash(policy);
    const trace_id = uuidv4();

    const result = await this.pool.query(
      `
      INSERT INTO fee_policy_registry (
        version, effective_at, posting_fee_percent, booking_fee_percent,
        transaction_fee_percent, tiers, region_overrides, notes, signature_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        policy.version,
        policy.effective_at,
        policy.posting_fee_percent,
        policy.booking_fee_percent,
        policy.transaction_fee_percent,
        JSON.stringify(policy.tiers),
        policy.region_overrides ? JSON.stringify(policy.region_overrides) : null,
        policy.notes,
        signature_hash
      ]
    );

    // Emit policy update event
    await this.emitEvent("fee_policy_updated", {
      policy_version: policy.version,
      effective_at: policy.effective_at,
      trace_id
    });

    return this.mapPolicyRow(result.rows[0]);
  }

  /**
   * Calculate posting fee (4% of reference price)
   */
  async calculatePostingFee(referencePriceUsd: number, traceId?: string): Promise<FeeCalculation> {
    const policy = await this.getCurrentPolicy();
    const finalTraceId = traceId || uuidv4();

    const posting_fee_usd =
      Math.round(((referencePriceUsd * policy.posting_fee_percent) / 100) * 100) / 100;

    return {
      base_amount_usd: referencePriceUsd,
      posting_fee_usd,
      booking_fee_usd: 0,
      total_fee_usd: posting_fee_usd,
      policy_version: policy.version,
      trace_id: finalTraceId,
      fx_rate: 1.0,
      currency: "USD"
    };
  }

  /**
   * Calculate booking fee (3% of booking amount)
   */
  async calculateBookingFee(bookingAmountUsd: number, traceId?: string): Promise<FeeCalculation> {
    const policy = await this.getCurrentPolicy();
    const finalTraceId = traceId || uuidv4();

    const booking_fee_usd =
      Math.round(((bookingAmountUsd * policy.booking_fee_percent) / 100) * 100) / 100;

    return {
      base_amount_usd: bookingAmountUsd,
      posting_fee_usd: 0,
      booking_fee_usd,
      total_fee_usd: booking_fee_usd,
      policy_version: policy.version,
      trace_id: finalTraceId,
      fx_rate: 1.0,
      currency: "USD"
    };
  }

  /**
   * Validate policy integrity at startup
   */
  async validatePolicyIntegrity(): Promise<boolean> {
    const policies = await this.pool.query("SELECT * FROM fee_policy_registry ORDER BY version");

    for (const row of policies.rows) {
      const policy = this.mapPolicyRow(row);
      const expectedHash = this.generateSignatureHash(policy);

      if (expectedHash !== policy.signature_hash) {
        console.error(`Policy integrity check failed for version ${policy.version}`);
        return false;
      }
    }

    console.log("Fee policy integrity validation passed");
    return true;
  }

  /**
   * Get tier configuration for host subscription
   */
  async getTierConfig(tierName: string): Promise<any> {
    const policy = await this.getCurrentPolicy();
    const tier = policy.tiers.find((t) => t.name === tierName);

    if (!tier) {
      throw new Error(`Tier '${tierName}' not found in current policy`);
    }

    return tier;
  }

  private mapPolicyRow(row: any): FeePolicy {
    return {
      version: row.version,
      effective_at: new Date(row.effective_at),
      posting_fee_percent: parseFloat(row.posting_fee_percent),
      booking_fee_percent: parseFloat(row.booking_fee_percent),
      transaction_fee_percent: parseFloat(row.transaction_fee_percent),
      tiers: row.tiers,
      region_overrides: row.region_overrides,
      notes: row.notes,
      signature_hash: row.signature_hash
    };
  }

  private generateSignatureHash(policy: Omit<FeePolicy, "signature_hash">): string {
    const data = `${policy.version}-${policy.effective_at.toISOString()}-${JSON.stringify(policy.tiers)}`;
    // In production, use proper cryptographic signing
    return require("crypto").createHash("sha256").update(data).digest("hex");
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    // Event emission logic would go here
    console.log(`Emitting event: ${eventType}`, payload);
  }
}
