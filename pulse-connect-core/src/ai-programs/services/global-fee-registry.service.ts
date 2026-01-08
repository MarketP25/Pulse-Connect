import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

export interface FeePolicyV4 {
  version: string;
  effective_at: Date;
  ai_program_policies: {
    basic: { usd_price: number; max_tokens: number };
    advanced: { usd_price: number; max_tokens: number };
    premium: { usd_price: number; max_tokens: number };
    bundles: {
      [key: string]: { total_usd: number; effective_price_per_run: number };
    };
    tier_credits: {
      starter: number;
      growth: number;
      enterprise: number;
      custom: string; // "negotiated"
    };
  };
  region_overrides: {
    [regionCode: string]: {
      discount_percent: number;
      fx_display?: boolean;
    };
  };
  global_fx_rates: {
    [currency: string]: number;
  };
  signature_hash: string;
}

export interface RegionalFeeCalculation {
  canonical_usd: number;
  regional_usd: number;
  fx_rate: number;
  currency: string;
  discount_percent: number;
  final_amount: number;
}

export class GlobalFeeRegistryService {
  constructor(private pool: Pool) {}

  /**
   * Get current active fee policy (v4.0)
   */
  async getCurrentPolicy(): Promise<FeePolicyV4> {
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
  async getPolicyByVersion(version: string): Promise<FeePolicyV4 | null> {
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
   * Create new fee policy v4.0 (admin only)
   */
  async createPolicy(policy: Omit<FeePolicyV4, "signature_hash">): Promise<FeePolicyV4> {
    const signature_hash = this.generateSignatureHash(policy);
    const trace_id = uuidv4();

    const result = await this.pool.query(
      `
      INSERT INTO fee_policy_registry (
        version, effective_at, ai_program_policies, region_overrides,
        global_fx_rates, signature_hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        policy.version,
        policy.effective_at,
        JSON.stringify(policy.ai_program_policies),
        JSON.stringify(policy.region_overrides),
        JSON.stringify(policy.global_fx_rates),
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
   * Calculate regional fee for AI program
   */
  async calculateRegionalFee(
    canonicalUsd: number,
    regionCode: string
  ): Promise<RegionalFeeCalculation> {
    const policy = await this.getCurrentPolicy();
    const regionOverride = policy.region_overrides[regionCode] || { discount_percent: 0 };
    const discountPercent = regionOverride.discount_percent || 0;

    // Apply discount
    const discountedUsd = canonicalUsd * (1 - discountPercent / 100);

    // Get FX rate for region
    const regionInfo = await this.getRegionInfo(regionCode);
    const fxRate = regionInfo.fx_rate;
    const currency = regionInfo.currency;

    // Calculate regional amount
    const regionalUsd = discountedUsd * fxRate;

    return {
      canonical_usd: canonicalUsd,
      regional_usd: regionalUsd,
      fx_rate: fxRate,
      currency: currency,
      discount_percent: discountPercent,
      final_amount: regionalUsd
    };
  }

  /**
   * Get AI program pricing
   */
  async getProgramPricing(programType: "basic" | "advanced" | "premium"): Promise<{
    usd_price: number;
    max_tokens: number;
  }> {
    const policy = await this.getCurrentPolicy();
    return policy.ai_program_policies[programType];
  }

  /**
   * Get bundle pricing
   */
  async getBundlePricing(bundleKey: string): Promise<{
    total_usd: number;
    effective_price_per_run: number;
  }> {
    const policy = await this.getCurrentPolicy();
    const bundle = policy.ai_program_policies.bundles[bundleKey];

    if (!bundle) {
      throw new Error(`Bundle '${bundleKey}' not found in current policy`);
    }

    return bundle;
  }

  /**
   * Get tier credits
   */
  async getTierCredits(tierName: string): Promise<number | string> {
    const policy = await this.getCurrentPolicy();
    const credits = policy.ai_program_policies.tier_credits[tierName];

    if (credits === undefined) {
      throw new Error(`Tier '${tierName}' not found in current policy`);
    }

    return credits;
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
   * Get FX rate for currency
   */
  async getFxRate(currency: string): Promise<number> {
    const policy = await this.getCurrentPolicy();
    return policy.global_fx_rates[currency] || 1.0;
  }

  /**
   * Update FX rates (called by external FX provider)
   */
  async updateFxRates(newRates: { [currency: string]: number }, traceId: string): Promise<void> {
    const currentPolicy = await this.getCurrentPolicy();

    const updatedRates = { ...currentPolicy.global_fx_rates, ...newRates };
    const newPolicy = {
      ...currentPolicy,
      global_fx_rates: updatedRates,
      version: this.incrementVersion(currentPolicy.version)
    };

    // Create new policy version with updated FX rates
    await this.createPolicy(newPolicy);

    await this.emitEvent("fx_rates_updated", {
      updated_currencies: Object.keys(newRates),
      trace_id: traceId
    });
  }

  /**
   * Get region information
   */
  private async getRegionInfo(regionCode: string): Promise<{
    fx_rate: number;
    currency: string;
    name: string;
  }> {
    const result = await this.pool.query(
      `
      SELECT region_name, currency_code, fx_provider FROM region_routing
      WHERE region_code = $1
    `,
      [regionCode]
    );

    if (result.rows.length === 0) {
      // Default to USD for unknown regions
      return { fx_rate: 1.0, currency: "USD", name: "Unknown" };
    }

    const region = result.rows[0];
    const fxRate = await this.getFxRate(region.currency_code);

    return {
      fx_rate: fxRate,
      currency: region.currency_code,
      name: region.region_name
    };
  }

  private mapPolicyRow(row: any): FeePolicyV4 {
    return {
      version: row.version,
      effective_at: new Date(row.effective_at),
      ai_program_policies: row.ai_program_policies || {
        basic: { usd_price: 2, max_tokens: 1000 },
        advanced: { usd_price: 5, max_tokens: 4000 },
        premium: { usd_price: 10, max_tokens: 16000 },
        bundles: {},
        tier_credits: { starter: 0, growth: 5, enterprise: 20, custom: "negotiated" }
      },
      region_overrides: row.region_overrides || {},
      global_fx_rates: row.global_fx_rates || { USD: 1.0 },
      signature_hash: row.signature_hash
    };
  }

  private generateSignatureHash(policy: Omit<FeePolicyV4, "signature_hash">): string {
    const data = `${policy.version}-${policy.effective_at.toISOString()}-${JSON.stringify(policy.ai_program_policies)}-${JSON.stringify(policy.region_overrides)}`;
    return createHash("sha256").update(data).digest("hex");
  }

  private incrementVersion(version: string): string {
    // Simple version increment (e.g., v4.0.0 -> v4.0.1)
    const parts = version.split(".");
    const patch = parseInt(parts[2]) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private async emitEvent(eventType: string, payload: any): Promise<void> {
    console.log(`Emitting event: ${eventType}`, payload);
  }
}
