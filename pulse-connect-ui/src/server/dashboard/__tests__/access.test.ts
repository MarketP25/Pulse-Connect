import { resolveModuleAccess } from "@/server/dashboard/access";
import { DashboardUser } from "@/types/dashboard";

function buildUser(overrides: Partial<DashboardUser>): DashboardUser {
  return {
    id: "user-1",
    displayName: "User",
    emailMasked: "us***@pulsco.com",
    emailHash: "hash",
    role: "individual",
    tier: "basic",
    preferredLanguage: "en",
    country: "US",
    city: "Austin",
    complianceProfile: "ccpa",
    kycStatus: "not_required",
    emailVerified: true,
    phoneVerified: false,
    referralCode: "REF-1",
    referralCredits: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("resolveModuleAccess", () => {
  it("restricts paid modules for basic tier", () => {
    const access = resolveModuleAccess(buildUser({ tier: "basic" }));
    expect(access.find((entry) => entry.module === "marketing")?.enabled).toBe(false);
    expect(access.find((entry) => entry.module === "ecommerce")?.enabled).toBe(false);
    expect(access.find((entry) => entry.module === "communication")?.enabled).toBe(true);
  });

  it("requires full KYC for premium paid modules", () => {
    const access = resolveModuleAccess(buildUser({ tier: "premium", kycStatus: "pending" }));
    expect(access.find((entry) => entry.module === "ecommerce")?.enabled).toBe(false);
    expect(access.find((entry) => entry.module === "marketing")?.enabled).toBe(false);
  });

  it("allows enterprise operations when full KYC is complete", () => {
    const access = resolveModuleAccess(
      buildUser({ tier: "enterprise", role: "admin", kycStatus: "verified" })
    );
    expect(access.find((entry) => entry.module === "operations")?.enabled).toBe(true);
    expect(access.find((entry) => entry.module === "reporting")?.enabled).toBe(true);
  });
});
