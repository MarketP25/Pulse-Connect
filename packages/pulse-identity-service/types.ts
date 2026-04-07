import {
  KycAutomationSignals,
  KycStatus,
  OnboardingRole,
  SubscriptionTier
} from "@pulsco/pulse-kyc-service";
export type {
  KycAutomationSignals,
  KycStatus,
  OnboardingRole,
  SubscriptionTier
} from "@pulsco/pulse-kyc-service";

export type UserLifecycleStatus = "pending_verification" | "pending_kyc" | "active" | "suspended";

export type ConsentType = "privacy_policy" | "terms_of_service" | "data_processing" | "marketing";

export interface ConsentPayload {
  accepted: boolean;
  version: string;
}

export interface ConsentInput {
  privacyPolicy: ConsentPayload;
  termsOfService: ConsentPayload;
  dataProcessing: ConsentPayload;
  marketing?: ConsentPayload;
}

export interface LocaleBinding {
  preferredLanguage: string;
  country: string;
  city?: string;
  currency: string;
  complianceProfile: string;
  translationContext: string;
}

export interface RolePolicy {
  role: OnboardingRole;
  dashboardRoute: string;
  featureAccess: string[];
}

export interface RegisterUserInput {
  email: string;
  password: string;
  username: string;
  role: OnboardingRole;
  preferredLanguage: string;
  country: string;
  city?: string;
  referralCode?: string;
  subscriptionTier?: SubscriptionTier;
  consents: ConsentInput;
  phoneVerified?: boolean;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  idempotencyKey?: string;
}

export interface VerifyEmailInput {
  token: string;
  ipAddress: string;
  userAgent: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
}

export interface RegisterUserResult {
  userId: string;
  emailVerificationRequired: boolean;
  kycStatus: KycStatus | "not_required";
  activationReady: boolean;
  dashboardRoute: string;
  subscriptionTier: SubscriptionTier;
  debug?: {
    verificationToken: string;
  };
}

export interface ActivationResult {
  userId: string;
  status: UserLifecycleStatus;
  accountUuidV7: string;
  pulscoInternalId: string;
  dashboardRoute: string;
  featureFlags: string[];
  subscriptionTier: SubscriptionTier;
}

export interface OnboardingStatusResult {
  userId: string;
  emailVerified: boolean;
  kycStatus: KycStatus | "not_required";
  accountStatus: UserLifecycleStatus;
  activationReady: boolean;
  requiredActions: string[];
}

export interface AuthenticatedSession {
  userId: string;
  sessionId: string;
  rotation: number;
}

export interface DashboardConsentSummary {
  consentType: ConsentType;
  accepted: boolean;
  version: string;
  createdAt: string;
}

export interface DashboardAuditSummary {
  action: string;
  actor: string;
  createdAt: string;
}

export interface DashboardReferralSummary {
  referralCode: string;
  referredByUserId?: string;
  successfulReferrals: number;
}

export interface DashboardSnapshot {
  userId: string;
  email: string;
  username: string;
  role: OnboardingRole;
  status: UserLifecycleStatus;
  subscriptionTier: SubscriptionTier;
  dashboardRoute: string;
  featureFlags: string[];
  emailVerified: boolean;
  phoneVerified: boolean;
  locale: LocaleBinding;
  trustScore: number;
  trustComponents: Record<string, number>;
  onboarding: OnboardingStatusResult;
  kycStatus: KycStatus | "not_required";
  referrals: DashboardReferralSummary;
  consentRecords: DashboardConsentSummary[];
  recentAudit: DashboardAuditSummary[];
}

export interface UpdateUserProfileInput {
  username?: string;
  preferredLanguage?: string;
  country?: string;
  city?: string;
}

export interface ChangeSubscriptionTierResult {
  userId: string;
  changed: boolean;
  pendingKyc: boolean;
  subscriptionTier: SubscriptionTier;
  kycStatus: KycStatus | "not_required";
  featureFlags: string[];
  billingLinked: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  accessExpiresInSec: number;
  refreshExpiresInSec: number;
  sessionId: string;
  dashboardRoute: string;
}

export interface UserRow {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  status: UserLifecycleStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  referralCode: string;
  referredByUserId?: string;
  role: OnboardingRole;
  subscriptionTier: SubscriptionTier;
  dashboardRoute: string;
  accountUuidV7?: string;
  pulscoInternalId?: string;
  featureFlags: string[];
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleRow {
  id: string;
  userId: string;
  role: OnboardingRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserLocaleRow extends LocaleBinding {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSecurityRow {
  id: string;
  userId: string;
  encryptedDeviceFingerprint: string;
  encryptedLastIpAddress: string;
  encryptedLastUserAgent: string;
  verificationTokenHash?: string;
  verificationTokenExpiry?: string;
  verificationTokenUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserTrustScoreRow {
  id: string;
  userId: string;
  score: number;
  components: Record<string, number>;
  initializedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecordRow {
  id: string;
  userId: string;
  consentType: ConsentType;
  accepted: boolean;
  version: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRow {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface KycStatusRow {
  id: string;
  userId: string;
  status: KycStatus | "not_required";
  level: "none" | "basic" | "enhanced" | "full";
  providerSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRow {
  id: string;
  userId?: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LoginSessionRow {
  id: string;
  userId: string;
  refreshTokenHash: string;
  encryptedDeviceFingerprint: string;
  encryptedIpAddress: string;
  encryptedUserAgent: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityPrecheckInput {
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  intent: "register" | "verify_email" | "login" | "refresh" | "activate";
}

export interface BillingSubscriptionRequest {
  accountId: string;
  tier: SubscriptionTier;
  region: string;
  idempotencyKey?: string;
}

export interface BillingSubscriptionResult {
  linked: boolean;
  provider: "billing-engine";
  planId: string;
  externalResult?: Record<string, unknown>;
}

export interface IdentityEvent {
  eventType: "user.created" | "user.verified" | "user.kyc_completed" | "user.login";
  userId: string;
  region: string;
  payload: Record<string, unknown>;
}

export interface AsyncQueue<TJob> {
  enqueue(job: TJob): Promise<void>;
}

export interface EmailQueueJob {
  type: "identity.email.verification";
  userId: string;
  email: string;
  verificationToken: string;
}

export interface KycQueueJob {
  type: "identity.kyc.start";
  userId: string;
  role: OnboardingRole;
  subscriptionTier: SubscriptionTier;
}
