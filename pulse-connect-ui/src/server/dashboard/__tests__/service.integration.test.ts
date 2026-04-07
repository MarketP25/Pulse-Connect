import {
  completeKyc,
  getDashboardSnapshot,
  purchaseEcommerceProduct,
  updateOnboarding,
  updateSubscriptionTier
} from "@/server/dashboard/service";

describe("dashboard service integration", () => {
  it("enforces paid-tier KYC flow before ecommerce purchase", async () => {
    const userId = `it-premium-${Date.now()}`;

    await updateSubscriptionTier(userId, { tier: "premium" });

    const pendingSnapshot = await getDashboardSnapshot(userId);
    expect(pendingSnapshot.user.kycStatus).toBe("pending");

    await expect(purchaseEcommerceProduct(userId, "prd-smart-commerce")).rejects.toMatchObject({
      code: "paid_tier_kyc_required",
      status: 403
    });

    await completeKyc(userId, true);
    await expect(purchaseEcommerceProduct(userId, "prd-smart-commerce")).resolves.toMatchObject({
      purchase: expect.any(Object)
    });
  });

  it("credits referrer when onboarding referral is attached", async () => {
    const referrerId = `it-referrer-${Date.now()}`;
    const referredId = `it-referred-${Date.now()}`;

    const referrerBefore = await getDashboardSnapshot(referrerId);
    const originalCredits = referrerBefore.user.referralCredits;
    const referralCode = referrerBefore.user.referralCode;

    await updateOnboarding(referredId, { referralCode });

    const referrerAfter = await getDashboardSnapshot(referrerId);
    expect(referrerAfter.user.referralCredits).toBe(originalCredits + 1);
  });
});
