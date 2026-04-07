import {
  chargeBillingActivity,
  fetchBillingServiceData,
  performBillingServiceAction
} from "@/server/dashboard/platform-clients";

describe("billing platform client", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.PULSCO_BILLING_API_URL;
    delete process.env.BILLING_ENGINE_URL;
  });

  it("maps subscription and ledger payloads from billing-engine", async () => {
    process.env.PULSCO_BILLING_API_URL = "http://billing.local";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          accountId: "acct-1",
          planId: "enterprise",
          status: "pending_change",
          region: "Europe West 1",
          periodEnd: "2026-03-15T00:00:00.000Z"
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            entryId: "le-1",
            type: "subscription_signup",
            amount: 349,
            balanceAfter: 4651,
            timestamp: "2026-03-01T00:00:00.000Z",
            policyVersion: "2026.03.01"
          }
        ]
      } as Response);

    const result = await fetchBillingServiceData("acct-1");
    expect(result?.source).toBe("billing-engine");
    expect(result?.subscription.tier).toBe("enterprise");
    expect(result?.subscription.status).toBe("pending");
    expect(result?.ledgerEntries[0]).toMatchObject({
      id: "le-1",
      amountUsd: 349,
      balanceUsd: 4651
    });
    expect(result?.policyVersions[0]?.version).toBe("2026.03.01");
  });

  it("hydrates plan pricing into upgrade payload and calls billing-engine", async () => {
    process.env.PULSCO_BILLING_API_URL = "http://billing.local";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { planId: "basic", priceUsd: 29 },
          { planId: "premium", priceUsd: 99 },
          { planId: "enterprise", priceUsd: 349 }
        ]
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          walletId: "wallet-acct-2",
          accountId: "acct-2",
          balance: 5000
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entryId: "sub-upgrade-1" })
      } as Response);

    const result = await performBillingServiceAction("acct-2", "upgrade", { tier: "premium" });
    expect(result?.entryId).toBe("sub-upgrade-1");

    const call = (global.fetch as jest.Mock).mock.calls[2];
    const [, init] = call;
    const body = JSON.parse(String(init.body));
    expect(body.newPlanId).toBe("premium");
    expect(body.newPrice).toBe(99);
    expect(body.walletId).toBe("wallet-acct-2");
  });

  it("creates wallet then charges activity", async () => {
    process.env.PULSCO_BILLING_API_URL = "http://billing.local";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ walletId: "wallet-acct-3", accountId: "acct-3", balance: 5000 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entryId: "act-1", amount: 101.55, sourceEngine: "ecommerce" })
      } as Response);

    const result = await chargeBillingActivity({
      userId: "acct-3",
      region: "US",
      event: {
        engine: "ecommerce",
        amount: 99
      }
    });

    expect(result?.entryId).toBe("act-1");
    expect(result?.sourceEngine).toBe("ecommerce");
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain("/marp/wallet/create");
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain("/marp/activity/charge");
  });
});
