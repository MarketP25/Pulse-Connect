export type KycStatus = "pending" | "verified" | "rejected";

export type KycRequirementLevel = "none" | "basic" | "enhanced" | "full";

export type OnboardingRole =
  | "admin"
  | "individual"
  | "business"
  | "organisation"
  | "investor"
  | "partner";

export type SubscriptionTier = "basic" | "premium" | "enterprise";

export interface KycRecord {
  id: string;
  userId: string;
  level: KycRequirementLevel;
  status: KycStatus;
  providerSessionId?: string;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KycAuditLog {
  id: string;
  userId: string;
  action: "kyc.initiated" | "kyc.verified" | "kyc.rejected";
  actorId: string;
  reason?: string;
  createdAt: string;
}

export interface KycRepository {
  getByUserId(userId: string): Promise<KycRecord | null>;
  upsert(record: KycRecord): Promise<void>;
  appendAudit(entry: KycAuditLog): Promise<void>;
  listAudit(userId: string): Promise<KycAuditLog[]>;
}

export interface StartKycWorkflowInput {
  userId: string;
  role: OnboardingRole;
  subscriptionTier: SubscriptionTier;
  actorId: string;
}

export interface CompleteKycWorkflowInput {
  userId: string;
  actorId: string;
  approved: boolean;
  reason?: string;
}

export interface KycAutomationSignals {
  ipRiskScore?: number;
  deviceConsistency?: boolean;
  referralTrusted?: boolean;
  documentCompleteness?: number;
}

export interface KycAutomationDecision {
  shouldProcess: boolean;
  approved: boolean;
  reason?: string;
  riskScore: number;
}
