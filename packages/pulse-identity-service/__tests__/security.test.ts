import { PulseKycService, InMemoryKycRepository } from "@pulsco/pulse-kyc-service";
import { BillingClient } from "../billing";
import { NoopIdentityEventPublisher } from "../event-publisher";
import { IdentityError } from "../errors";
import { PulseIdentityService } from "../service";
import { InMemoryIdentityStorageAdapter } from "../storage";
import { InMemoryRateLimiter, decryptSensitive, encryptSensitive } from "../security";

class StubBillingClient implements BillingClient {
  async linkSubscription() {
    return {
      linked: true,
      provider: "billing-engine" as const,
      planId: "basic-free"
    };
  }
}

function createService() {
  return new PulseIdentityService(
    {
      storage: new InMemoryIdentityStorageAdapter(),
      kycService: new PulseKycService(new InMemoryKycRepository()),
      billingClient: new StubBillingClient(),
      eventPublisher: new NoopIdentityEventPublisher(),
      rateLimiter: new InMemoryRateLimiter()
    },
    { exposeDebugTokens: true, jwtSecret: "security-test-secret" }
  );
}

describe("identity security controls", () => {
  it.each([
    ["too short", "12345"],
    ["no numbers", "PasswordNoNums"],
    ["common password", "password123"]
  ])("rejects weak password because it is %s", async (_, password) => {
    const service = createService();
    const registrationData = {
      email: "test@example.com",
      password: password,
      username: "test_user",
      role: "individual" as const,
      preferredLanguage: "en",
      country: "US",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" }
      },
      deviceFingerprint: "device-test",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    };
    await expect(service.registerUser(registrationData))
      .rejects.toMatchObject({ code: "weak_password" });
  });

  it("blocks bot user agents", async () => {
    const service = createService();
    await expect(
      service.registerUser({
        email: "bot@example.com",
        password: "StrongPass!234",
        username: "bot_user",
        role: "individual",
        preferredLanguage: "en",
        country: "US",
        consents: {
          privacyPolicy: { accepted: true, version: "2026.03" },
          termsOfService: { accepted: true, version: "2026.03" },
          dataProcessing: { accepted: true, version: "2026.03" }
        },
        deviceFingerprint: "device-bot-1",
        ipAddress: "127.0.0.1",
        userAgent: "curl/8.0"
      })
    ).rejects.toMatchObject<IdentityError>({ code: "bot_detected" } as IdentityError);
  });

  it("rotates refresh tokens and invalidates stale token reuse", async () => {
    const service = createService();
    const created = await service.registerUser({
      email: "rotate@example.com",
      password: "StrongPass!234",
      username: "rotate_user",
      role: "individual",
      preferredLanguage: "en",
      country: "US",
      consents: {
        privacyPolicy: { accepted: true, version: "2026.03" },
        termsOfService: { accepted: true, version: "2026.03" },
        dataProcessing: { accepted: true, version: "2026.03" }
      },
      deviceFingerprint: "device-rotate-1",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    });
    await service.verifyEmail({
      token: created.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    });
    await service.activateAccount(created.userId);

    const login = await service.login({
      email: "rotate@example.com",
      password: "StrongPass!234",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
      deviceFingerprint: "device-rotate-1"
    });

    const rotated = await service.refreshTokens({
      refreshToken: login.refreshToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    });
    expect(rotated.refreshToken).not.toBe(login.refreshToken);

    await expect(
      service.refreshTokens({
        refreshToken: login.refreshToken,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0 PulscoWeb"
      })
    ).rejects.toMatchObject<IdentityError>({ code: "refresh_token_mismatch" } as IdentityError);
  });

  it("encrypts sensitive metadata before storage", () => {
    const cipher = encryptSensitive("192.168.1.1");
    expect(cipher).not.toContain("192.168.1.1");
    expect(decryptSensitive(cipher)).toBe("192.168.1.1");
  });
});
