import { randomUUID } from "crypto";
import {
  CompleteKycWorkflowInput,
  KycAutomationDecision,
  KycAutomationSignals,
  KycAuditLog,
  KycRecord,
  KycRepository,
  KycRequirementLevel,
  OnboardingRole,
  StartKycWorkflowInput,
  SubscriptionTier,
} from "./types";

const ALWAYS_HIGH_RISK_ROLES = new Set<OnboardingRole>(["organisation", "partner"]);

export class InMemoryKycRepository implements KycRepository {
  private records = new Map<string, KycRecord>();
  private audit: KycAuditLog[] = [];

  async getByUserId(userId: string): Promise<KycRecord | null> {
    return this.records.get(userId) || null;
  }

  async upsert(record: KycRecord): Promise<void> {
    this.records.set(record.userId, record);
  }

  async appendAudit(entry: KycAuditLog): Promise<void> {
    this.audit.push(entry);
  }

  async listAudit(userId: string): Promise<KycAuditLog[]> {
    return this.audit.filter((item) => item.userId === userId);
  }
}

export class PulseKycService {
  constructor(private readonly repository: KycRepository) {}

  determineRequirementLevel(role: OnboardingRole, subscriptionTier: SubscriptionTier): KycRequirementLevel {
    if (ALWAYS_HIGH_RISK_ROLES.has(role)) {
      return "full";
    }

    // Paid tiers are high-assurance and require full verification.
    if (subscriptionTier === "premium" || subscriptionTier === "enterprise") {
      return "full";
    }

    return "none";
  }

  requiresKyc(role: OnboardingRole, subscriptionTier: SubscriptionTier): boolean {
    return this.determineRequirementLevel(role, subscriptionTier) !== "none";
  }

  async startWorkflow(input: StartKycWorkflowInput): Promise<KycRecord | null> {
    const level = this.determineRequirementLevel(input.role, input.subscriptionTier);
    if (level === "none") {
      return null;
    }

    const now = new Date().toISOString();
    const existing = await this.repository.getByUserId(input.userId);

    const record: KycRecord = {
      id: existing?.id || randomUUID(),
      userId: input.userId,
      level,
      status: "pending",
      providerSessionId: existing?.providerSessionId || `kyc_${randomUUID()}`,
      metadata: {
        role: input.role,
        subscriptionTier: input.subscriptionTier,
      },
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    await this.repository.upsert(record);
    await this.repository.appendAudit({
      id: randomUUID(),
      userId: input.userId,
      action: "kyc.initiated",
      actorId: input.actorId,
      createdAt: now,
    });

    return record;
  }

  async completeWorkflow(input: CompleteKycWorkflowInput): Promise<KycRecord> {
    const record = await this.repository.getByUserId(input.userId);
    if (!record) {
      throw new Error("kyc_record_not_found");
    }

    const now = new Date().toISOString();
    const updated: KycRecord = {
      ...record,
      status: input.approved ? "verified" : "rejected",
      rejectionReason: input.approved ? undefined : input.reason || "verification_failed",
      updatedAt: now,
    };

    await this.repository.upsert(updated);
    await this.repository.appendAudit({
      id: randomUUID(),
      userId: input.userId,
      action: input.approved ? "kyc.verified" : "kyc.rejected",
      actorId: input.actorId,
      reason: input.reason,
      createdAt: now,
    });

    return updated;
  }

  async evaluatePending(userId: string, signals: KycAutomationSignals = {}): Promise<KycAutomationDecision> {
    const record = await this.repository.getByUserId(userId);
    if (!record) {
      throw new Error("kyc_record_not_found");
    }

    if (record.status !== "pending") {
      return {
        shouldProcess: false,
        approved: record.status === "verified",
        reason: `already_${record.status}`,
        riskScore: 0,
      };
    }

    const ipRisk = this.clamp(signals.ipRiskScore ?? 8, 0, 100);
    const deviceConsistency = signals.deviceConsistency ?? true;
    const referralTrusted = signals.referralTrusted ?? true;
    const documentCompleteness = this.clamp(signals.documentCompleteness ?? 1, 0, 1);

    let riskScore = ipRisk * 0.5;
    if (!deviceConsistency) {
      riskScore += 35;
    }
    if (!referralTrusted) {
      riskScore += 10;
    }
    riskScore += (1 - documentCompleteness) * 40;
    riskScore = this.clamp(riskScore, 0, 100);

    const thresholdByLevel: Record<string, number> = {
      basic: 55,
      enhanced: 40,
      full: 30,
    };
    const threshold = thresholdByLevel[record.level] ?? 50;
    const approved = riskScore <= threshold;

    return {
      shouldProcess: true,
      approved,
      reason: approved ? undefined : "automation_risk_exceeded",
      riskScore,
    };
  }

  async getStatus(userId: string) {
    return this.repository.getByUserId(userId);
  }

  private clamp(value: number, min: number, max: number) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }
}
