import { PulseKycService, InMemoryKycRepository } from "@pulsco/pulse-kyc-service";
import { BillingClient } from "../billing";
import { NoopIdentityEventPublisher } from "../event-publisher";
import { IdentityError } from "../errors";
import { PulseIdentityService } from "../service";
import { InMemoryIdentityStorageAdapter } from "../storage";

class TrackingBillingClient implements BillingClient {
  public calls: Array<{ accountId: string; tier: string }> = [];

  async linkSubscription(input: any) {
    this.calls.push({ accountId: input.accountId, tier: input.tier });
    return {
      linked: true,
      provider: "billing-engine" as const,
      planId: input.tier === "enterprise" ? "enterprise-monthly" : "premium-monthly",
      externalResult: { ok: true },
    };
  }
}

describe("PulseIdentityService onboarding integration", () => {
  it("blocks activation until required KYC completes, then activates with billing linkage", async () => {
    const billing = new TrackingBillingClient();
    const service = new PulseIdentityService(
      {
        storage: new InMemoryIdentityStorageAdapter(),
        kycService: new PulseKycService(new InMemoryKycRepository()),
        billingClient: billing,
        eventPublisher: new NoopIdentityEventPublisher(),
      },
      {
        exposeDebugTokens: true,
        jwtSecret: "integration-secret",
      },
    );

    const registered = await service.registerUser({
      email: "paid@example.com",
      password: "StrongPass!234",
      username: "paid_user",
      role: "business",
      preferredLanguage: "en",
      country: "US",
      subscriptionTier: "premium",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" },
      },
      deviceFingerprint: "integration-device-1",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    expect(registered.kycStatus).toBe("pending");

    await service.verifyEmail({
      token: registered.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    await expect(service.activateAccount(registered.userId)).rejects.toMatchObject<IdentityError>({
      code: "activation_prerequisites_not_met",
    } as IdentityError);

    await service.completeKycWorkflow(registered.userId, true, "kyc-provider");
    const activated = await service.activateAccount(registered.userId);
    expect(activated.status).toBe("active");
    expect(activated.accountUuidV7).toBeTruthy();
    expect(activated.pulscoInternalId).toContain("PUL-");

    expect(billing.calls).toEqual(
      expect.arrayContaining([{ accountId: registered.userId, tier: "premium" }]),
    );
  });

  it("automates KYC processing when automation is enabled", async () => {
    const billing = new TrackingBillingClient();
    const service = new PulseIdentityService(
      {
        storage: new InMemoryIdentityStorageAdapter(),
        kycService: new PulseKycService(new InMemoryKycRepository()),
        billingClient: billing,
        eventPublisher: new NoopIdentityEventPublisher(),
      },
      {
        exposeDebugTokens: true,
        jwtSecret: "integration-secret",
        autoKycEnabled: true,
      },
    );

    const registered = await service.registerUser({
      email: "auto-kyc@example.com",
      password: "StrongPass!234",
      username: "auto_kyc",
      role: "business",
      preferredLanguage: "en",
      country: "US",
      subscriptionTier: "premium",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" },
      },
      deviceFingerprint: "integration-device-2",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    expect(registered.kycStatus).toBe("verified");

    await service.verifyEmail({
      token: registered.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    const activated = await service.activateAccount(registered.userId);
    expect(activated.status).toBe("active");
  });

  it("automates KYC processing for organisation users when automation is enabled", async () => {
    const billing = new TrackingBillingClient();
    const service = new PulseIdentityService(
      {
        storage: new InMemoryIdentityStorageAdapter(),
        kycService: new PulseKycService(new InMemoryKycRepository()),
        billingClient: billing,
        eventPublisher: new NoopIdentityEventPublisher(),
      },
      {
        exposeDebugTokens: true,
        jwtSecret: "integration-secret",
        autoKycEnabled: true,
      },
    );

    const registered = await service.registerUser({
      email: "organisation@example.com",
      password: "StrongPass!234",
      username: "organisation_user",
      role: "organisation",
      preferredLanguage: "en",
      country: "US",
      subscriptionTier: "enterprise",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" },
      },
      deviceFingerprint: "integration-device-3",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    expect(registered.kycStatus).toBe("verified");

    await service.verifyEmail({
      token: registered.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
    });

    const activated = await service.activateAccount(registered.userId);
    expect(activated.status).toBe("active");
  });
});
