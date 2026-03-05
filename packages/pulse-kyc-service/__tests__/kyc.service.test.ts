import { InMemoryKycRepository, PulseKycService } from "../index";

describe("PulseKycService", () => {
  it("does not require KYC for basic individual onboarding", async () => {
    const service = new PulseKycService(new InMemoryKycRepository());
    expect(service.requiresKyc("individual", "basic")).toBe(false);
    expect(await service.startWorkflow({
      userId: "u1",
      role: "individual",
      subscriptionTier: "basic",
      actorId: "identity-service",
    })).toBeNull();
  });

  it("requires KYC for premium tier users", async () => {
    const service = new PulseKycService(new InMemoryKycRepository());
    const started = await service.startWorkflow({
      userId: "u2",
      role: "business",
      subscriptionTier: "premium",
      actorId: "identity-service",
    });

    expect(started).not.toBeNull();
    expect(started?.status).toBe("pending");
    expect(started?.level).toBe("full");
  });

  it("applies full level for organisation and partner roles", () => {
    const service = new PulseKycService(new InMemoryKycRepository());
    expect(service.determineRequirementLevel("organisation", "basic")).toBe("full");
    expect(service.determineRequirementLevel("partner", "basic")).toBe("full");
  });

  it("updates status through verification callbacks", async () => {
    const service = new PulseKycService(new InMemoryKycRepository());
    await service.startWorkflow({
      userId: "u3",
      role: "business",
      subscriptionTier: "premium",
      actorId: "identity-service",
    });

    const approved = await service.completeWorkflow({
      userId: "u3",
      actorId: "kyc-provider",
      approved: true,
    });
    expect(approved.status).toBe("verified");

    const restarted = await service.startWorkflow({
      userId: "u3",
      role: "business",
      subscriptionTier: "premium",
      actorId: "identity-service",
    });
    expect(restarted?.status).toBe("pending");

    const rejected = await service.completeWorkflow({
      userId: "u3",
      actorId: "kyc-provider",
      approved: false,
      reason: "document_mismatch",
    });
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("document_mismatch");
  });

  it("supports risk-based automation evaluation for pending records", async () => {
    const service = new PulseKycService(new InMemoryKycRepository());
    await service.startWorkflow({
      userId: "u4",
      role: "business",
      subscriptionTier: "premium",
      actorId: "identity-service",
    });

    const lowRisk = await service.evaluatePending("u4", {
      ipRiskScore: 5,
      deviceConsistency: true,
      referralTrusted: true,
      documentCompleteness: 1,
    });
    expect(lowRisk.shouldProcess).toBe(true);
    expect(lowRisk.approved).toBe(true);

    const highRisk = await service.evaluatePending("u4", {
      ipRiskScore: 95,
      deviceConsistency: false,
      referralTrusted: false,
      documentCompleteness: 0.4,
    });
    expect(highRisk.shouldProcess).toBe(true);
    expect(highRisk.approved).toBe(false);
    expect(highRisk.reason).toBe("automation_risk_exceeded");
  });
});
