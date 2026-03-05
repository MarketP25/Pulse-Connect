import { PolicyRegistry } from "./policyRegistry";
import { LedgerService } from "./ledger";
import { WalletService } from "./wallet";
import { Orchestrator } from "./orchestrator";
import * as matchmaking from "./engines/matchmaking";
import * as ecommerce from "./engines/ecommerce";
import * as places from "./engines/places";
import * as communication from "./engines/communication";
import * as papv1 from "./engines/papv1";
import * as aiPrograms from "./engines/aiPrograms";
import * as localization from "./engines/localization";
import fs from "fs";

async function run() {
  const policy = new PolicyRegistry();
  const ledger = new LedgerService();
  const wallet = new WalletService();
  const orch = new Orchestrator(policy, ledger, wallet);

  // seed policies and offers
  policy.addPolicy({
    policyId: "marp.subscriptions",
    version: "v1",
    signedBy: "MARP",
    effectiveFrom: "2026-01-01T00:00:00Z",
    scope: "subscriptions",
    payload: { notes: "Subscription pricing v1" },
  });

  policy.addOffer({
    offerId: "founding-500",
    policyId: "marp.offers",
    policyVersion: "v1",
    scope: "subscriptions",
    discountPercent: 20,
    effectiveFrom: "2026-01-01T00:00:00Z",
  });

  // create wallet
  const accountId = "U1";
  const walletId = "w-U1";
  wallet.createWallet(walletId, accountId, 200); // pre-fund $200 to exercise flows

  const now = new Date().toISOString();
  const FAST = process.env.SIMULATE_FAST === '1';
  const SEED = process.env.SIMULATE_SEED || String(Date.now());
  const OUT_DIR = process.env.SIMULATE_OUTPUT_DIR || 'outputs';

  // simple seeded RNG (LCG) for deterministic ids when SEED is set
  function seededRng(seed: string) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () {
      s = (s * 1103515245 + 12345) >>> 0;
      return (s >>> 0) / 0x100000000;
    };
  }

  const rng = seededRng(SEED);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // A) Signup premium
  const signupEntry = orch.chargeSubscription(accountId, walletId, "premium", 9.99, "Europe West 1", now, "signup-1");
  console.log("Signup ledger:", signupEntry);

  // B) E-Commerce weekly charge (seller)
  if (!FAST) {
    const sellerPlanCharge = ecommerce.weeklyChargeForPlan('growth');
    try {
      wallet.debit(walletId, sellerPlanCharge);
      const e = ledger.append({ entryId: `ec-${Math.floor(rng()*1e9)}`, timestamp: new Date().toISOString(), accountId: 'seller-S1', walletId, type: 'ecommerce_subscription', amount: sellerPlanCharge, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'E-Commerce weekly plan charge' });
      console.log('E-Commerce ledger:', e);
    } catch (err: any) { console.error('E-Commerce charge failed', err.message); }
  }

  // C) Matchmaking transaction
  const match = matchmaking.lockCommissionOnAcceptance('match-123', 120);
  try {
    wallet.debit(walletId, match.commission);
    const e = ledger.append({ entryId: `match-${Date.now()}`, timestamp: new Date().toISOString(), accountId: accountId, walletId, type: 'commission', amount: match.commission, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'Matchmaking commission (locked at acceptance)' });
    console.log('Match commission ledger:', e);
  } catch (err: any) { console.error('Match commission failed', err.message); }

  // D) Places booking
  const placeComm = places.placesCommission(5000);
  try { wallet.debit(walletId, placeComm); ledger.append({ entryId: `place-${Date.now()}`, timestamp: new Date().toISOString(), accountId, walletId, type: 'places_commission', amount: placeComm, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'Places commission' }); } catch (e) { }

  // E) Communication - 250 minutes
  const commCharge = communication.chargeMinutes(250);
  try { wallet.debit(walletId, commCharge); ledger.append({ entryId: `comm-${Date.now()}`, timestamp: new Date().toISOString(), accountId, walletId, type: 'communication', amount: commCharge, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'Voice/video usage' }); } catch (e) { }

  // F) PAPv1 token purchase and execution
  const papPack = papv1.purchaseTokens('base');
  try { wallet.debit(walletId, papPack.price); ledger.append({ entryId: `pap-${Date.now()}`, timestamp: new Date().toISOString(), accountId, walletId, type: 'pap_purchase', amount: papPack.price, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'PAPv1 base token purchase' }); } catch (e) { }

  // G) AI program purchase
  if (!FAST) {
    const aiPack = aiPrograms.aiProgramPurchase('medium');
    try { wallet.debit(walletId, aiPack.price); ledger.append({ entryId: `ai-${Math.floor(rng()*1e9)}`, timestamp: new Date().toISOString(), accountId, walletId, type: 'ai_purchase', amount: aiPack.price, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'AI program token pack' }); } catch (e) { }
  }

  // H) Localization request
  if (!FAST) {
    const locPrice = localization.priceForLocalization(1200, 0, { type: 'text', tier: 'standard' });
    try { wallet.debit(walletId, locPrice); ledger.append({ entryId: `loc-${Math.floor(rng()*1e9)}`, timestamp: new Date().toISOString(), accountId, walletId, type: 'localization', amount: locPrice, currency: 'USD', balanceAfter: wallet.get(walletId)!.balance, userExplanation: 'Localization text translation' }); } catch (e) { }
  }

  // Renewal simulation at +30 days
  const renewTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const renew = orch.chargeSubscription(accountId, walletId, "premium", 9.99, "Europe West 1", renewTime, "renew-1");
    console.log("Renewal ledger:", renew);
  } catch (e) {
    console.error("renewal failed", (e as any).message);
  }

  // Cancellation: mark cancel effective end of period (no immediate refund)

  // Export ledger to file for validation and produce a brief design summary
  const all = ledger.all();
  const ledgerPath = `${OUT_DIR}/ledger_export_${SEED}.json`;
  fs.writeFileSync(ledgerPath, JSON.stringify(all, null, 2), 'utf8');
  const design = `Design summary:\n- Policies: ${JSON.stringify(policy, null, 2)}\n- Ledger entries: ${all.length}\n`;
  const designPath = `${OUT_DIR}/design_summary_${SEED}.txt`;
  fs.writeFileSync(designPath, design, 'utf8');

  console.log('Final wallet state:', wallet.get(walletId));
  console.log(`All ledger entries exported to ${ledgerPath}`);

  // Validations
  const entries = ledger.entriesForAccount(accountId);
  const idempKeys = entries.map((e) => e.idempotencyKey).filter(Boolean as any);
  const duplicates = new Set(idempKeys).size !== idempKeys.length;
  if (duplicates) throw new Error("duplicate idempotency detected");
  if (wallet.get(walletId)!.balance < 0) throw new Error("negative balance");

  console.log("Simulation completed: no duplicates, no negative balances.");
}

run().catch((e) => { console.error(e); process.exit(1); });
