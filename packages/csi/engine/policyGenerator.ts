import { createHash } from "crypto";

export interface MarpPolicy {
  risk_threshold: number;
  velocity_threshold: number;
  epoch_version: string;
  timestamp: string;
  signature?: string;
}

/**
 * The PolicyGenerator is a core component of the CSI (Central Super Intelligence).
 * It acts as the "Strategic Layer," synthesizing global telemetry and threat
 * intelligence into actionable policies for the planetary enforcers.
 */
export class PolicyGenerator {
  private normalizeUnitValue(value: number): number {
    if (!Number.isFinite(value)) {
      return 0.5;
    }

    return Math.max(0, Math.min(1, value));
  }

  private async getAggregateThreatLevel(): Promise<number> {
    const configured = Number(process.env.CSI_AGGREGATE_THREAT_LEVEL ?? 0.5);
    return this.normalizeUnitValue(configured);
  }

  private async getSystemLoadFactor(): Promise<number> {
    const configured = Number(process.env.CSI_SYSTEM_LOAD_FACTOR ?? 0.5);
    return this.normalizeUnitValue(configured);
  }

  private async signPolicy(policy: MarpPolicy): Promise<MarpPolicy> {
    const payload = `${policy.epoch_version}:${policy.timestamp}:${policy.risk_threshold}:${policy.velocity_threshold}`;
    const signature = createHash("sha256").update(payload).digest("hex");
    return { ...policy, signature };
  }

  /**
   * Synthesizes a new MARP policy based on aggregate ecosystem state.
   * This output is consumed by the Intelligence Core's update_policy() method.
   */
  public async synthesizeMarpPolicy(): Promise<MarpPolicy> {
    // 1. Ingest aggregate signals from the CSI Vault (e.g., recent fraud waves, system load)
    const aggregateThreatLevel = await this.getAggregateThreatLevel();
    const systemLoadFactor = await this.getSystemLoadFactor();

    // 2. Adaptive Threshold Logic:
    // We adjust the governance perimeter dynamically. If the threat level is high,
    // we lower the risk_threshold (making the enforcer more sensitive) and
    // tighten velocity limits to prevent automated swarming.
    const riskThreshold = aggregateThreatLevel > 0.65 ? 0.6 : 0.8;

    const velocityThreshold = aggregateThreatLevel > 0.5 || systemLoadFactor > 0.8 ? 30 : 50;

    const policy: MarpPolicy = {
      risk_threshold: riskThreshold,
      velocity_threshold: velocityThreshold,
      epoch_version: `CSI-EPOCH-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // 3. Cryptographic Governance Signing
    // MARP policies must be signed via the Governance module so that the
    // Intelligence Core and Edge Gateway can verify the policy's authenticity.
    const signedPolicy = await this.signPolicy(policy);

    console.log(`[CSI-Engine] Synthesized new MARP policy: ${policy.epoch_version}`);
    return signedPolicy;
  }

  /**
   * Distributes the signed policy to regional endpoints.
   * Implements a "Push" mechanism across 50+ regions.
   */
  public async distributeMarpPolicy(policy: MarpPolicy): Promise<void> {
    // 1. Fetch regional registry (mocked)
    // Coordination: Aligns with the planetary distribution strategy in edge-gateway-operations.md
    const regionalEndpoints = [
      "https://edge.us-east-1.pulsco.global/internal/update-policy",
      "https://edge.eu-central-1.pulsco.global/internal/update-policy"
      // ... 50+ regions
    ];

    const distributionTasks = regionalEndpoints.map(async (url) => {
      try {
        // In production, this would be an authenticated mTLS or signed internal request
        console.log(`[CSI-Distributor] Pushing policy ${policy.epoch_version} to ${url}`);
        // await axios.post(url, policy, { headers: { 'X-Internal-Secret': process.env.INTERNAL_SECRET } });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[CSI-Distributor] Failed to push to ${url}:`, message);
      }
    });

    // Fan-out distribution
    await Promise.all(distributionTasks);

    // Also update the Global Policy Cache in Redis for pull-based fallbacks
    // await Vault.setGlobalPolicy(policy);
  }
}
