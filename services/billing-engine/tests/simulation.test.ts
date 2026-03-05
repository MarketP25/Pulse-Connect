import { PolicyRegistry } from "../src/policyRegistry";
import { LedgerService } from "../src/ledger";
import { WalletService } from "../src/wallet";
import { Orchestrator } from "../src/orchestrator";

test("simulate signup->usage->renewal no negative balance", () => {
  const policy = new PolicyRegistry();
  const ledger = new LedgerService();
  const wallet = new WalletService();
  const orch = new Orchestrator(policy, ledger, wallet);

  policy.addPolicy({ policyId: "marp.subscriptions", version: "v1", signedBy: "MARP", effectiveFrom: "2026-01-01T00:00:00Z", scope: "subscriptions", payload: {} });
  policy.addOffer({ offerId: "founding-500", policyId: "marp.offers", policyVersion: "v1", scope: "subscriptions", discountPercent: 20, effectiveFrom: "2026-01-01T00:00:00Z" as any });

  const accountId = "U1";
  const walletId = "w-U1";
  wallet.createWallet(walletId, accountId, 50);

  const now = new Date().toISOString();
  const signup = orch.chargeSubscription(accountId, walletId, "premium", 9.99, "Europe West 1", now, "signup-test");
  expect(signup).toBeDefined();

  // commission
  const commission = +(120 * 0.035).toFixed(2);
  wallet.debit(walletId, commission);
  ledger.append({ entryId: "t-comm", timestamp: new Date().toISOString(), accountId: "seller-S1", walletId, type: "commission", amount: commission, currency: "USD", balanceAfter: wallet.get(walletId)!.balance, userExplanation: "test" });

  const renewTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const renew = orch.chargeSubscription(accountId, walletId, "premium", 9.99, "Europe West 1", renewTime, "renew-test");
  expect(renew).toBeDefined();

  expect(wallet.get(walletId)!.balance).toBeGreaterThanOrEqual(0);
});
