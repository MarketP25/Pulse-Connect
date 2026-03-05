import { randomUUID } from "crypto";
import { PulseKycService } from "@pulsco/pulse-kyc-service";
import { BillingClient } from "./billing";
import { IdentityError } from "./errors";
import { IdentityEventPublisher } from "./event-publisher";
import {
  assertSecurityPrechecks,
  assertStrongPassword,
  decryptSensitive,
  deriveDeviceFingerprint,
  encryptSensitive,
  hashPassword,
  hashValue,
  normalizeEmail,
  normalizeUsername,
  signToken,
  verifyPassword,
  verifyToken,
  InMemoryRateLimiter,
  RateLimiter,
} from "./security";
import { SessionStore, InMemorySessionStore } from "./session-store";
import { IdentityStorageAdapter } from "./storage";
import { computeInitialTrustScore } from "./trust-score";
import {
  ActivationResult,
  AsyncQueue,
  AuthTokens,
  BillingSubscriptionRequest,
  ConsentInput,
  ConsentRecordRow,
  EmailQueueJob,
  IdentityEvent,
  KycQueueJob,
  KycStatusRow,
  LocaleBinding,
  LoginInput,
  LoginSessionRow,
  OnboardingStatusResult,
  OnboardingRole,
  RefreshTokenInput,
  RegisterUserInput,
  RegisterUserResult,
  RolePolicy,
  SecurityPrecheckInput,
  SubscriptionTier,
  UserRow,
  VerifyEmailInput,
  KycAutomationSignals,
} from "./types";
import { InMemoryAsyncQueue } from "./queue";

type IdentityServiceDeps = {
  storage: IdentityStorageAdapter;
  kycService: PulseKycService;
  billingClient: BillingClient;
  eventPublisher: IdentityEventPublisher;
  sessionStore?: SessionStore;
  rateLimiter?: RateLimiter;
  emailQueue?: AsyncQueue<EmailQueueJob>;
  kycQueue?: AsyncQueue<KycQueueJob>;
};

type IdentityServiceOptions = {
  jwtSecret?: string;
  refreshTtlSec?: number;
  accessTtlSec?: number;
  emailVerificationTtlSec?: number;
  exposeDebugTokens?: boolean;
  autoKycEnabled?: boolean;
};

const REQUIRED_CONSENTS = [
  { field: "privacyPolicy", type: "privacy_policy" },
  { field: "termsOfService", type: "terms_of_service" },
  { field: "dataProcessing", type: "data_processing" },
] as const;

const ROLE_POLICIES: Record<OnboardingRole, RolePolicy> = {
  admin: {
    role: "admin",
    dashboardRoute: "/admin",
    featureAccess: ["core", "admin", "users", "settings"],
  },
  individual: {
    role: "individual",
    dashboardRoute: "/dashboard/individual",
    featureAccess: ["core", "localization"],
  },
  business: {
    role: "business",
    dashboardRoute: "/dashboard/business",
    featureAccess: ["core", "ecommerce", "billing", "communication"],
  },
  organisation: {
    role: "organisation",
    dashboardRoute: "/dashboard/organisation",
    featureAccess: ["core", "compliance", "audit", "security"],
  },
  investor: {
    role: "investor",
    dashboardRoute: "/dashboard/investor",
    featureAccess: ["core", "analytics", "governance"],
  },
  partner: {
    role: "partner",
    dashboardRoute: "/dashboard/partner",
    featureAccess: ["core", "places", "communication"],
  },
};

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  KE: "KES",
  IN: "INR",
};

const COUNTRY_REGION: Record<string, string> = {
  US: "Europe West 1",
  GB: "Europe West 1",
  DE: "Europe West 1",
  FR: "Europe West 1",
  KE: "Africa South 1",
  NG: "Africa South 1",
  IN: "Asia East 1",
};

function safeUuidV7(): string {
  return randomUUID();
}

export class PulseIdentityService {
  private readonly jwtSecret: string;
  private readonly refreshTtlSec: number;
  private readonly accessTtlSec: number;
  private readonly emailVerificationTtlSec: number;
  private readonly exposeDebugTokens: boolean;
  private readonly sessionStore: SessionStore;
  private readonly rateLimiter: RateLimiter;
  private readonly emailQueue: AsyncQueue<EmailQueueJob>;
  private readonly kycQueue: AsyncQueue<KycQueueJob>;
  private readonly autoKycEnabled: boolean;

  constructor(
    private readonly deps: IdentityServiceDeps,
    options: IdentityServiceOptions = {},
  ) {
    this.jwtSecret = options.jwtSecret || process.env.PULSE_IDENTITY_JWT_SECRET || "pulse-identity-dev-secret";
    this.refreshTtlSec = options.refreshTtlSec || 60 * 60 * 24 * 30;
    this.accessTtlSec = options.accessTtlSec || 60 * 15;
    this.emailVerificationTtlSec = options.emailVerificationTtlSec || 60 * 60 * 24;
    this.exposeDebugTokens = Boolean(options.exposeDebugTokens);
    this.sessionStore = deps.sessionStore || new InMemorySessionStore();
    this.rateLimiter = deps.rateLimiter || new InMemoryRateLimiter();
    this.emailQueue = deps.emailQueue || new InMemoryAsyncQueue<EmailQueueJob>();
    this.kycQueue = deps.kycQueue || new InMemoryAsyncQueue<KycQueueJob>();
    this.autoKycEnabled = options.autoKycEnabled ?? false;
  }

  async registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
    await this.precheck({
      intent: "register",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceFingerprint: input.deviceFingerprint,
    });

    assertStrongPassword(input.password);
    this.assertRequiredConsents(input.consents);

    const email = normalizeEmail(input.email);
    const username = normalizeUsername(input.username);
    const tier: SubscriptionTier = input.subscriptionTier || "basic";
    const rolePolicy = ROLE_POLICIES[input.role];
    if (!rolePolicy) {
      throw new IdentityError("invalid_role", 400, "Selected role is invalid");
    }

    if (input.idempotencyKey) {
      const cached = await this.deps.storage.getIdempotentResponse<RegisterUserResult>("register", input.idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    const localeBinding = this.resolveLocaleBinding(input.preferredLanguage, input.country, input.city);
    const now = new Date().toISOString();
    const userId = randomUUID();
    const referralCode = this.generateReferralCode(username);
    const passwordHash = await hashPassword(input.password);

    let referralTrusted = false;
    let referredByUserId: string | undefined;
    if (input.referralCode) {
      const referrer = await this.deps.storage.findUserByReferralCode(input.referralCode);
      if (!referrer) {
        throw new IdentityError("invalid_referral_code", 400, "Referral code does not exist");
      }
      if (referrer.email === email || referrer.username === username) {
        throw new IdentityError("self_referral_blocked", 400, "Self-referral is not allowed");
      }
      referralTrusted = true;
      referredByUserId = referrer.id;
    }

    const [existingEmail, existingUsername] = await Promise.all([
      this.deps.storage.findUserByEmail(email),
      this.deps.storage.findUserByUsername(username),
    ]);
    if (existingEmail) {
      throw new IdentityError("email_conflict", 409, "Email already exists");
    }
    if (existingUsername) {
      throw new IdentityError("username_conflict", 409, "Username already exists");
    }

    const verificationToken = signToken(
      {
        sub: userId,
        sid: randomUUID(),
        typ: "verify_email",
      },
      this.jwtSecret,
      this.emailVerificationTtlSec,
    );

    const userRow: UserRow = {
      id: userId,
      email,
      username,
      passwordHash,
      status: "pending_verification",
      emailVerified: false,
      phoneVerified: Boolean(input.phoneVerified),
      referralCode,
      referredByUserId,
      role: input.role,
      subscriptionTier: tier,
      dashboardRoute: rolePolicy.dashboardRoute,
      featureFlags: this.resolveFeatureFlags(rolePolicy, tier),
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.storage.insertUser(userRow);
    await this.deps.storage.upsertUserRole({
      id: randomUUID(),
      userId,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    });
    await this.deps.storage.upsertUserLocale({
      id: randomUUID(),
      userId,
      preferredLanguage: localeBinding.preferredLanguage,
      country: localeBinding.country,
      city: localeBinding.city,
      currency: localeBinding.currency,
      complianceProfile: localeBinding.complianceProfile,
      translationContext: localeBinding.translationContext,
      createdAt: now,
      updatedAt: now,
    });
    await this.deps.storage.upsertUserSecurity({
      id: randomUUID(),
      userId,
      encryptedDeviceFingerprint: encryptSensitive(deriveDeviceFingerprint(input.deviceFingerprint, input.userAgent)),
      encryptedLastIpAddress: encryptSensitive(input.ipAddress),
      encryptedLastUserAgent: encryptSensitive(input.userAgent),
      verificationTokenHash: hashValue(verificationToken),
      verificationTokenExpiry: new Date(Date.now() + this.emailVerificationTtlSec * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    await this.recordConsentRows(userId, input.consents, input.ipAddress, input.userAgent, now);

    if (referredByUserId) {
      const existingReferral = await this.deps.storage.getReferralByReferredUser(userId);
      if (existingReferral) {
        throw new IdentityError("duplicate_referral_blocked", 409, "Referral already attached");
      }
      await this.deps.storage.insertReferral({
        id: randomUUID(),
        referrerUserId: referredByUserId,
        referredUserId: userId,
        referralCode: input.referralCode || "",
        createdAt: now,
        updatedAt: now,
      });
    }

    const kycRecord = await this.deps.kycService.startWorkflow({
      userId,
      role: input.role,
      subscriptionTier: tier,
      actorId: "pulse-identity-service",
    });
    const kycStatus: KycStatusRow = {
      id: randomUUID(),
      userId,
      status: kycRecord?.status || "not_required",
      level: kycRecord?.level || "none",
      providerSessionId: kycRecord?.providerSessionId,
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.storage.upsertKycStatus(kycStatus);
    if (kycRecord) {
      await this.kycQueue.enqueue({
        type: "identity.kyc.start",
        userId,
        role: input.role,
        subscriptionTier: tier,
      });
    }

    await this.upsertTrustScore(userRow, localeBinding.country, true, referralTrusted);
    await this.emailQueue.enqueue({
      type: "identity.email.verification",
      userId,
      email,
      verificationToken,
    });

    await this.appendAudit(userId, "identity.user.registered", "identity-service", {
      role: input.role,
      subscriptionTier: tier,
      referralAttached: Boolean(referredByUserId),
    });
    await this.emitIdentityEvent({
      eventType: "user.created",
      userId,
      region: localeBinding.country,
      payload: {
        role: input.role,
        subscriptionTier: tier,
      },
    });

    const result: RegisterUserResult = {
      userId,
      emailVerificationRequired: true,
      kycStatus: kycStatus.status,
      activationReady: false,
      dashboardRoute: rolePolicy.dashboardRoute,
      subscriptionTier: tier,
      debug: this.exposeDebugTokens ? { verificationToken } : undefined,
    };

    if (this.autoKycEnabled && kycStatus.status === "pending") {
      try {
        const automated = await this.autoProcessKyc(userId, {
          ipRiskScore: this.estimateIpRisk(input.ipAddress),
          deviceConsistency: true,
          referralTrusted,
          documentCompleteness: 1,
        });
        result.kycStatus = automated.status;
      } catch (error) {
        await this.appendAudit(userId, "identity.kyc.automation_failed", "kyc-automation-bot", {
          message: error instanceof Error ? error.message : "unknown_error",
        });
      }
    }

    if (input.idempotencyKey) {
      await this.deps.storage.setIdempotentResponse("register", input.idempotencyKey, result);
    }

    return result;
  }

  async verifyEmail(input: VerifyEmailInput): Promise<{ verified: boolean; activationReady: boolean }> {
    await this.precheck({
      intent: "verify_email",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceFingerprint: "verify-email-device",
    });

    const payload = verifyToken<{ sub: string; typ: string }>(input.token, this.jwtSecret);
    if (payload.typ !== "verify_email") {
      throw new IdentityError("invalid_verification_token", 401, "Invalid verification token type");
    }

    const user = await this.deps.storage.findUserById(payload.sub);
    if (!user) {
      throw new IdentityError("user_not_found", 404, "User does not exist");
    }

    const security = await this.deps.storage.getUserSecurity(user.id);
    if (!security?.verificationTokenHash || security.verificationTokenHash !== hashValue(input.token)) {
      throw new IdentityError("invalid_verification_token", 401, "Email verification token is invalid");
    }
    if (security.verificationTokenUsedAt) {
      throw new IdentityError("verification_token_used", 409, "Email verification token already used");
    }

    const now = new Date().toISOString();
    const nextUser: UserRow = {
      ...user,
      emailVerified: true,
      updatedAt: now,
    };
    await this.deps.storage.updateUser(nextUser);
    await this.deps.storage.upsertUserSecurity({
      ...security,
      verificationTokenUsedAt: now,
      verificationTokenHash: undefined,
      verificationTokenExpiry: undefined,
      updatedAt: now,
    });
    await this.upsertTrustScore(nextUser, (await this.getUserCountry(nextUser.id)) || "US", true);
    await this.appendAudit(nextUser.id, "identity.user.email_verified", "identity-service", {});
    await this.emitIdentityEvent({
      eventType: "user.verified",
      userId: nextUser.id,
      region: (await this.getUserCountry(nextUser.id)) || "US",
      payload: {},
    });

    let activationReady = false;
    try {
      await this.activateAccount(nextUser.id, "identity-service");
      activationReady = true;
    } catch (error) {
      if (!(error instanceof IdentityError) || error.code !== "activation_prerequisites_not_met") {
        throw error;
      }
    }

    return { verified: true, activationReady };
  }

  async completeKycWorkflow(
    userId: string,
    approved: boolean,
    actorId = "kyc-provider",
    reason?: string,
  ): Promise<KycStatusRow> {
    const updated = await this.deps.kycService.completeWorkflow({
      userId,
      actorId,
      approved,
      reason,
    });

    const now = new Date().toISOString();
    const row: KycStatusRow = {
      id: randomUUID(),
      userId,
      status: updated.status,
      level: updated.level,
      providerSessionId: updated.providerSessionId,
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.storage.upsertKycStatus(row);

    const user = await this.deps.storage.findUserById(userId);
    if (!user) {
      throw new IdentityError("user_not_found", 404, "User does not exist");
    }

    await this.upsertTrustScore(user, (await this.getUserCountry(userId)) || "US", true);
    await this.appendAudit(userId, "identity.user.kyc_updated", actorId, {
      status: updated.status,
      reason: reason || null,
    });

    if (updated.status === "verified") {
      await this.emitIdentityEvent({
        eventType: "user.kyc_completed",
        userId,
        region: (await this.getUserCountry(userId)) || "US",
        payload: {},
      });
      try {
        await this.activateAccount(userId, "identity-service");
      } catch (error) {
        if (!(error instanceof IdentityError) || error.code !== "activation_prerequisites_not_met") {
          throw error;
        }
      }
    }

    return row;
  }

  async autoProcessKyc(
    userId: string,
    signals: KycAutomationSignals = {},
    actorId = "kyc-automation-bot",
  ): Promise<KycStatusRow> {
    const evaluation = await this.deps.kycService.evaluatePending(userId, signals);
    if (!evaluation.shouldProcess) {
      const current = await this.deps.storage.getKycStatus(userId);
      if (!current) {
        throw new IdentityError("kyc_status_not_found", 404, "KYC status not found");
      }
      return current;
    }

    await this.appendAudit(userId, "identity.kyc.automation_evaluated", actorId, {
      riskScore: evaluation.riskScore,
      approved: evaluation.approved,
      reason: evaluation.reason || null,
    });

    return this.completeKycWorkflow(userId, evaluation.approved, actorId, evaluation.reason);
  }

  async getKycStatus(userId: string): Promise<KycStatusRow | null> {
    return this.deps.storage.getKycStatus(userId);
  }

  async getOnboardingStatus(userId: string): Promise<OnboardingStatusResult> {
    const [user, role, consents, kyc] = await Promise.all([
      this.deps.storage.findUserById(userId),
      this.deps.storage.getUserRole(userId),
      this.deps.storage.listConsentRecords(userId),
      this.deps.storage.getKycStatus(userId),
    ]);

    if (!user || !role) {
      throw new IdentityError("user_not_found", 404, "User does not exist");
    }

    const requiresKyc = this.deps.kycService.requiresKyc(role.role, user.subscriptionTier);
    const requiredActions: string[] = [];
    if (!user.emailVerified) {
      requiredActions.push("verify_email");
    }
    const hasConsent = REQUIRED_CONSENTS.every((required) =>
      consents.some((entry) => entry.consentType === required.type && entry.accepted),
    );
    if (!hasConsent) {
      requiredActions.push("accept_required_consents");
    }
    if (requiresKyc && kyc?.status !== "verified") {
      requiredActions.push("complete_kyc");
    }

    return {
      userId: user.id,
      emailVerified: user.emailVerified,
      kycStatus: kyc?.status || "not_required",
      accountStatus: user.status,
      activationReady: requiredActions.length === 0,
      requiredActions,
    };
  }

  async activateAccount(userId: string, actorId = "identity-service"): Promise<ActivationResult> {
    const [user, roleRow, locale, kycStatus, consents] = await Promise.all([
      this.deps.storage.findUserById(userId),
      this.deps.storage.getUserRole(userId),
      this.deps.storage.getUserLocale(userId),
      this.deps.storage.getKycStatus(userId),
      this.deps.storage.listConsentRecords(userId),
    ]);

    if (!user || !roleRow || !locale) {
      throw new IdentityError("user_not_found", 404, "User is missing required onboarding state");
    }

    if (user.status === "active" && user.accountUuidV7 && user.pulscoInternalId) {
      return {
        userId: user.id,
        status: "active",
        accountUuidV7: user.accountUuidV7,
        pulscoInternalId: user.pulscoInternalId,
        dashboardRoute: user.dashboardRoute,
        featureFlags: user.featureFlags,
        subscriptionTier: user.subscriptionTier,
      };
    }

    const requiresKyc = this.deps.kycService.requiresKyc(roleRow.role, user.subscriptionTier);
    const hasRequiredConsent = REQUIRED_CONSENTS.every((required) =>
      consents.some((entry) => entry.consentType === required.type && entry.accepted),
    );

    if (!user.emailVerified || !hasRequiredConsent || (requiresKyc && kycStatus?.status !== "verified")) {
      throw new IdentityError("activation_prerequisites_not_met", 400, "Activation prerequisites are not satisfied", {
        emailVerified: user.emailVerified,
        hasRequiredConsent,
        requiresKyc,
        kycStatus: kycStatus?.status || "not_required",
      });
    }

    const rolePolicy = ROLE_POLICIES[roleRow.role];
    const now = new Date().toISOString();
    const accountUuidV7 = user.accountUuidV7 || safeUuidV7();
    const pulscoInternalId = user.pulscoInternalId || this.buildPulscoInternalId(locale.country, accountUuidV7);
    const featureFlags = this.resolveFeatureFlags(rolePolicy, user.subscriptionTier);

    const updatedUser: UserRow = {
      ...user,
      status: "active",
      accountUuidV7,
      pulscoInternalId,
      dashboardRoute: rolePolicy.dashboardRoute,
      featureFlags,
      activatedAt: user.activatedAt || now,
      updatedAt: now,
    };
    await this.deps.storage.updateUser(updatedUser);

    const billingRequest: BillingSubscriptionRequest = {
      accountId: user.id,
      tier: user.subscriptionTier,
      region: this.resolveBillingRegion(locale.country),
      idempotencyKey: `activate:${user.id}:${user.subscriptionTier}`,
    };
    const billingResult = await this.deps.billingClient.linkSubscription(billingRequest);

    await this.appendAudit(user.id, "identity.user.activated", actorId, {
      billingLinked: billingResult.linked,
      tier: user.subscriptionTier,
      dashboardRoute: rolePolicy.dashboardRoute,
    });

    return {
      userId: user.id,
      status: "active",
      accountUuidV7,
      pulscoInternalId,
      dashboardRoute: rolePolicy.dashboardRoute,
      featureFlags,
      subscriptionTier: user.subscriptionTier,
    };
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    await this.precheck({
      intent: "login",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceFingerprint: input.deviceFingerprint,
    });

    const email = normalizeEmail(input.email);
    const user = await this.deps.storage.findUserByEmail(email);
    if (!user) {
      throw new IdentityError("invalid_credentials", 401, "Invalid credentials");
    }
    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new IdentityError("invalid_credentials", 401, "Invalid credentials");
    }
    if (user.status !== "active") {
      throw new IdentityError("account_not_active", 403, "Account activation is required before login");
    }

    const security = await this.deps.storage.getUserSecurity(user.id);
    const incomingFingerprint = deriveDeviceFingerprint(input.deviceFingerprint, input.userAgent);
    let deviceConsistency = true;
    if (security) {
      const priorFingerprint = decryptSensitive(security.encryptedDeviceFingerprint);
      deviceConsistency = priorFingerprint === incomingFingerprint;
    }

    const sessionId = randomUUID();
    const rolePolicy = ROLE_POLICIES[user.role];
    const dashboardRoute = rolePolicy?.dashboardRoute || "/dashboard";
    const tokens = this.issueAuthTokens(user.id, sessionId, 0, dashboardRoute);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.refreshTtlSec * 1000).toISOString();

    const session: LoginSessionRow = {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashValue(tokens.refreshToken),
      encryptedDeviceFingerprint: encryptSensitive(incomingFingerprint),
      encryptedIpAddress: encryptSensitive(input.ipAddress),
      encryptedUserAgent: encryptSensitive(input.userAgent),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.storage.insertLoginSession(session);
    await this.sessionStore.set(sessionId, { userId: user.id }, this.refreshTtlSec);

    if (security) {
      await this.deps.storage.upsertUserSecurity({
        ...security,
        encryptedDeviceFingerprint: encryptSensitive(incomingFingerprint),
        encryptedLastIpAddress: encryptSensitive(input.ipAddress),
        encryptedLastUserAgent: encryptSensitive(input.userAgent),
        updatedAt: now,
      });
    }

    const country = (await this.getUserCountry(user.id)) || "US";
    await this.upsertTrustScore(user, country, deviceConsistency);
    await this.appendAudit(user.id, "identity.user.login", "identity-service", {
      sessionId,
      deviceConsistency,
    });
    await this.emitIdentityEvent({
      eventType: "user.login",
      userId: user.id,
      region: country,
      payload: {
        sessionId,
        deviceConsistency,
      },
    });

    return tokens;
  }

  async refreshTokens(input: RefreshTokenInput): Promise<AuthTokens> {
    await this.precheck({
      intent: "refresh",
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceFingerprint: "refresh-token-device",
    });

    const payload = verifyToken<{ sub: string; sid: string; typ: string; rot?: number }>(input.refreshToken, this.jwtSecret);
    if (payload.typ !== "refresh") {
      throw new IdentityError("invalid_refresh_token", 401, "Refresh token type invalid");
    }

    const session = await this.deps.storage.findLoginSessionById(payload.sid);
    if (!session || session.userId !== payload.sub) {
      throw new IdentityError("session_not_found", 401, "Session not found");
    }
    if (session.revokedAt) {
      throw new IdentityError("session_revoked", 401, "Session has been revoked");
    }
    if (session.expiresAt < new Date().toISOString()) {
      throw new IdentityError("session_expired", 401, "Session expired");
    }
    if (session.refreshTokenHash !== hashValue(input.refreshToken)) {
      throw new IdentityError("refresh_token_mismatch", 401, "Refresh token mismatch");
    }

    const nextRotation = (payload.rot || 0) + 1;
    const tokens = this.issueAuthTokens(payload.sub, payload.sid, nextRotation);
    const now = new Date().toISOString();
    await this.deps.storage.updateLoginSession({
      ...session,
      refreshTokenHash: hashValue(tokens.refreshToken),
      updatedAt: now,
    });
    await this.sessionStore.set(payload.sid, { userId: payload.sub, rot: nextRotation }, this.refreshTtlSec);
    return tokens;
  }

  async logout(sessionId: string): Promise<void> {
    await this.deps.storage.revokeLoginSession(sessionId);
    await this.sessionStore.delete(sessionId);
  }

  private async precheck(input: SecurityPrecheckInput) {
    await assertSecurityPrechecks(input, this.rateLimiter);
  }

  private issueAuthTokens(userId: string, sessionId: string, rotation: number, dashboardRoute: string = "/dashboard"): AuthTokens {
    const accessToken = signToken(
      {
        sub: userId,
        sid: sessionId,
        typ: "access",
        rot: rotation,
      },
      this.jwtSecret,
      this.accessTtlSec,
    );
    const refreshToken = signToken(
      {
        sub: userId,
        sid: sessionId,
        typ: "refresh",
        rot: rotation,
      },
      this.jwtSecret,
      this.refreshTtlSec,
    );

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      accessExpiresInSec: this.accessTtlSec,
      refreshExpiresInSec: this.refreshTtlSec,
      sessionId,
      dashboardRoute,
    };
  }

  private assertRequiredConsents(consents: ConsentInput) {
    for (const required of REQUIRED_CONSENTS) {
      const entry = consents[required.field];
      if (!entry || !entry.accepted || !entry.version) {
        throw new IdentityError("missing_required_consent", 400, `Missing required consent: ${required.field}`);
      }
    }
  }

  private async recordConsentRows(
    userId: string,
    consents: ConsentInput,
    ipAddress: string,
    userAgent: string,
    createdAt: string,
  ) {
    const rows: ConsentRecordRow[] = [
      {
        id: randomUUID(),
        userId,
        consentType: "privacy_policy",
        accepted: consents.privacyPolicy.accepted,
        version: consents.privacyPolicy.version,
        ipAddress: encryptSensitive(ipAddress),
        userAgent: encryptSensitive(userAgent),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        userId,
        consentType: "terms_of_service",
        accepted: consents.termsOfService.accepted,
        version: consents.termsOfService.version,
        ipAddress: encryptSensitive(ipAddress),
        userAgent: encryptSensitive(userAgent),
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: randomUUID(),
        userId,
        consentType: "data_processing",
        accepted: consents.dataProcessing.accepted,
        version: consents.dataProcessing.version,
        ipAddress: encryptSensitive(ipAddress),
        userAgent: encryptSensitive(userAgent),
        createdAt,
        updatedAt: createdAt,
      },
    ];

    if (consents.marketing) {
      rows.push({
        id: randomUUID(),
        userId,
        consentType: "marketing",
        accepted: consents.marketing.accepted,
        version: consents.marketing.version,
        ipAddress: encryptSensitive(ipAddress),
        userAgent: encryptSensitive(userAgent),
        createdAt,
        updatedAt: createdAt,
      });
    }

    for (const row of rows) {
      await this.deps.storage.insertConsentRecord(row);
    }
  }

  private resolveLocaleBinding(preferredLanguage: string, country: string, city?: string): LocaleBinding {
    const cc = country.trim().toUpperCase();
    const language = preferredLanguage.trim().toLowerCase();
    return {
      preferredLanguage: language,
      country: cc,
      city,
      currency: COUNTRY_CURRENCY[cc] || "USD",
      complianceProfile: cc === "DE" || cc === "FR" || cc === "GB" ? "gdpr" : cc === "US" ? "ccpa" : "global-default",
      translationContext: `${language}-${cc}`,
    };
  }

  private resolveFeatureFlags(rolePolicy: RolePolicy, tier: SubscriptionTier): string[] {
    const tierFeatures = tier === "enterprise" ? ["tier.enterprise"] : tier === "premium" ? ["tier.premium"] : ["tier.basic"];
    return [...new Set([...rolePolicy.featureAccess, ...tierFeatures])];
  }

  private resolveBillingRegion(country: string): string {
    return COUNTRY_REGION[country.trim().toUpperCase()] || "Europe West 1";
  }

  private buildPulscoInternalId(country: string, accountUuidV7: string): string {
    const cc = country.trim().toUpperCase().slice(0, 2) || "GL";
    return `PUL-${cc}-${accountUuidV7.replace(/-/g, "").slice(-12).toUpperCase()}`;
  }

  private async getUserCountry(userId: string): Promise<string | null> {
    const locale = await this.deps.storage.getUserLocale(userId);
    return locale?.country || null;
  }

  private generateReferralCode(username: string): string {
    return `${username.replace(/[^a-z0-9]/g, "").slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
  }

  private estimateIpRisk(ipAddress: string): number {
    if (ipAddress.startsWith("10.") || ipAddress.startsWith("192.168.") || ipAddress === "127.0.0.1") {
      return 5;
    }
    if (ipAddress.startsWith("172.")) {
      return 12;
    }
    return 18;
  }

  private async appendAudit(userId: string | undefined, action: string, actor: string, metadata: Record<string, unknown>) {
    const now = new Date().toISOString();
    await this.deps.storage.insertAuditLog({
      id: randomUUID(),
      userId,
      action,
      actor,
      metadata,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async emitIdentityEvent(event: IdentityEvent): Promise<void> {
    try {
      await this.deps.eventPublisher.publish(event);
    } catch (error) {
      await this.appendAudit(event.userId, "identity.event.publish_failed", "identity-service", {
        eventType: event.eventType,
        message: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  private async upsertTrustScore(
    user: UserRow,
    country: string,
    deviceConsistency = true,
    referralTrusted?: boolean,
  ): Promise<void> {
    const kycStatus = await this.deps.storage.getKycStatus(user.id);
    const referral = await this.deps.storage.getReferralByReferredUser(user.id);
    const trust = computeInitialTrustScore({
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      kycPassed: kycStatus?.status === "verified",
      referralTrusted: referralTrusted ?? Boolean(referral),
      deviceConsistency,
    });

    const existing = await this.deps.storage.getTrustScore(user.id);
    const now = new Date().toISOString();
    await this.deps.storage.upsertTrustScore({
      id: existing?.id || randomUUID(),
      userId: user.id,
      score: trust.score,
      components: trust.components,
      initializedBy: "pulse-identity-service",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
  }
}
