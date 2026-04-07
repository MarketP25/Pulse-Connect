import { PulseKycService, InMemoryKycRepository } from "@pulsco/pulse-kyc-service";
import { BillingClient } from "../billing";
import { IdentityEventPublisher } from "../event-publisher";
import { IdentityError } from "../errors";
import { PulseIdentityService } from "../service";
import { InMemoryIdentityStorageAdapter } from "../storage";

class StubBillingClient implements BillingClient {
  async linkSubscription() {
    return {
      linked: true,
      provider: "billing-engine" as const,
      planId: "basic-free"
    };
  }
}

class CollectingPublisher implements IdentityEventPublisher {
  public readonly events: string[] = [];
  async publish(event: any) {
    this.events.push(event.eventType);
  }
}

function createService() {
  const storage = new InMemoryIdentityStorageAdapter();
  const publisher = new CollectingPublisher();
  const service = new PulseIdentityService(
    {
      storage,
      kycService: new PulseKycService(new InMemoryKycRepository()),
      billingClient: new StubBillingClient(),
      eventPublisher: publisher
    },
    {
      exposeDebugTokens: true,
      jwtSecret: "test-secret"
    }
  );
  return { service, publisher, storage };
}

const baseInput = {
  email: "person@example.com",
  password: "StrongPass!234",
  username: "person_one",
  role: "individual" as const,
  preferredLanguage: "en",
  country: "US",
  consents: {
    privacyPolicy: { accepted: true, version: "2026.03" },
    termsOfService: { accepted: true, version: "2026.03" },
    dataProcessing: { accepted: true, version: "2026.03" }
  },
  deviceFingerprint: "device-fingerprint-001",
  ipAddress: "127.0.0.1",
  userAgent: "Mozilla/5.0 PulscoWeb"
};

describe("PulseIdentityService registration", () => {
  it("rejects duplicate email", async () => {
    const { service } = createService();
    await service.registerUser(baseInput);

    await expect(
      service.registerUser({
        ...baseInput,
        username: "person_two"
      })
    ).rejects.toMatchObject<IdentityError>({ code: "email_conflict" } as IdentityError);
  });

  it("prevents invalid/self referral abuse", async () => {
    const { service, storage } = createService();

    await expect(
      service.registerUser({
        ...baseInput,
        email: "new@example.com",
        username: "new_user",
        referralCode: "NOPE-CODE"
      })
    ).rejects.toMatchObject<IdentityError>({ code: "invalid_referral_code" } as IdentityError);

    const first = await service.registerUser({
      ...baseInput,
      email: "referrer@example.com",
      username: "referrer"
    });

    // Verify referrer email first so account is valid in system state.
    await service.verifyEmail({
      token: first.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    });

    const referrer = await storage.findUserByEmail("referrer@example.com");
    const referrerCode = referrer!.referralCode;

    // Self-referral is explicitly blocked.
    await expect(
      service.registerUser({
        ...baseInput,
        email: "referrer@example.com",
        username: "referrer2",
        referralCode: referrerCode
      })
    ).rejects.toMatchObject<IdentityError>({ code: "self_referral_blocked" } as IdentityError);
  });

  it("enforces consent version presence", async () => {
    const { service } = createService();
    await expect(
      service.registerUser({
        ...baseInput,
        email: "consent-missing@example.com",
        username: "consent_missing",
        consents: {
          ...baseInput.consents,
          termsOfService: { accepted: true, version: "" }
        }
      })
    ).rejects.toMatchObject<IdentityError>({ code: "missing_required_consent" } as IdentityError);
  });

  it("publishes passive events via gateway publisher", async () => {
    const { service, publisher } = createService();
    const created = await service.registerUser({
      ...baseInput,
      email: "events@example.com",
      username: "events_user"
    });

    await service.verifyEmail({
      token: created.debug!.verificationToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb"
    });

    await service.activateAccount(created.userId);

    await service.login({
      email: "events@example.com",
      password: "StrongPass!234",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 PulscoWeb",
      deviceFingerprint: "device-fingerprint-001"
    });

    expect(publisher.events).toEqual(
      expect.arrayContaining(["user.created", "user.verified", "user.login"])
    );
  });
});
