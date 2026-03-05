import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
// OpenAPI + validation
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
const OpenApiValidator = require('express-openapi-validator');
import { PolicyRegistry } from "./policyRegistry";
import { Policy } from "./types";
import { LedgerService } from "./ledger";
import { WalletService } from "./wallet";
import { Orchestrator } from "./orchestrator";
import { JSONPersistence } from "./persistence";
import { PostgresPersistence } from "./persistence_pg";
import { MARPKV } from "./kms";

const DEFAULT_SUBSCRIPTION_PLANS = [
  { planId: "basic", priceUsd: 29 },
  { planId: "premium", priceUsd: 99 },
  { planId: "enterprise", priceUsd: 349 },
];

async function createServer(persistenceOverride?: any) {
  const marp = new MARPKV();
  let persistence: JSONPersistence | PostgresPersistence = new JSONPersistence();
  if (persistenceOverride) {
    persistence = persistenceOverride;
    try { if ((persistence as any).connect) await (persistence as any).connect(); } catch(e){}
  } else if (process.env.DATABASE_URL) {
    const pg = new PostgresPersistence(process.env.DATABASE_URL);
    await pg.connect();
    persistence = pg as any;
  }

  const policy = new PolicyRegistry(marp);
  const ledger = new LedgerService();
  const wallet = new WalletService();
  const orch = new Orchestrator(policy, ledger, wallet, (persistence as any));

  // hydrate from persistence
  const persistedPolicies = await (persistence as any).loadPolicies();
  for (const p of persistedPolicies) {
    try { policy.addPolicy(p); } catch (e) { console.warn('skipping invalid policy', e.message); }
  }
  const persistedOffers = await (persistence as any).loadOffers();
  for (const o of persistedOffers) policy.addOffer(o);
  const persistedWallets = await (persistence as any).loadWallets();
  for (const w of persistedWallets) wallet.createWallet(w.walletId, w.accountId, w.balance);
  const persistedLedger = await (persistence as any).loadLedger();
  for (const e of persistedLedger) ledger.append(e as any);
  // load persisted subscriptions (if any)
  if ((persistence as any).loadSubscriptions) {
    try {
      const subs = await (persistence as any).loadSubscriptions();
      if (subs && subs.length) (orch as any).importSubscriptions(subs);
    } catch (e) { console.warn('failed loading subscriptions', e.message); }
  }

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  async function ensureWalletRecord(walletId: string, accountId: string): Promise<void> {
    const existing = wallet.get(walletId);
    if (existing) return;
    const seedBalance = Number(process.env.MARP_DEFAULT_WALLET_BALANCE || 5000);
    const created = wallet.createWallet(walletId, accountId, seedBalance);
    try {
      if ((persistence as any).saveWallet) {
        await (persistence as any).saveWallet(created);
      } else {
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
      }
    } catch (e: any) {
      console.warn("wallet persistence save failed", e.message);
    }
  }

  // Load OpenAPI spec and mount docs + request validator
  try {
    const apiSpec = YAML.load(require('path').join(__dirname, '..', 'openapi.yaml'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
    // install the validator (validates requests and responses against spec)
    await new OpenApiValidator.default({ apiSpec, validateRequests: true, validateResponses: true }).install(app);
  } catch (e) {
    console.warn('OpenAPI validator not installed or spec not found', (e as any).message);
  }

  app.post("/marp/billing/calculate", (req, res) => {
    const { base, region, at } = req.body;
    const atIso = at || new Date().toISOString();
    const out = orch.calculateCharge(base, region, [], atIso);
    res.json(out);
  });

  app.post("/marp/wallet/create", async (req, res) => {
    const { walletId, accountId, balance } = req.body || {};
    if (!walletId || !accountId) {
      return res.status(400).json({ error: "walletId_and_accountId_required" });
    }
    try {
      const existing = wallet.get(walletId);
      if (existing) {
        return res.json(existing);
      }
      const created = wallet.createWallet(walletId, accountId, Number(balance || 0));
      try {
        if ((persistence as any).saveWallet) {
          await (persistence as any).saveWallet(created);
        } else {
          const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e: any) {
        console.warn("wallet persistence save failed", e.message);
      }
      return res.json(created);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  app.get("/marp/wallet/:walletId", (req, res) => {
    const { walletId } = req.params;
    const record = wallet.get(walletId);
    if (!record) return res.status(404).json({ error: "not_found" });
    return res.json(record);
  });

  app.post("/marp/billing/charge", async (req, res) => {
    const { accountId, walletId, planId, price, region, at, idempotencyKey } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const entry = orch.chargeSubscription(accountId, walletId, planId, price, region, at || new Date().toISOString(), idempotencyKey);
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          // persist individual entry to Postgres
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e) {
        console.warn('persistence save failed', (e as any).message);
      }
      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/marp/ledger/:accountId", (req, res) => {
    const { accountId } = req.params;
    res.json(ledger.entriesForAccount(accountId));
  });

  // Activity quote endpoint (no wallet mutation)
  app.post('/marp/activity/calculate', async (req, res) => {
    const { event, region, at } = req.body || {};
    if (!event || !event.engine) {
      return res.status(400).json({ error: 'event_and_engine_required' });
    }
    try {
      const atIso = at || new Date().toISOString();
      const { getEngine } = await import('./activity');
      const engine = getEngine(event.engine);
      const policyScope = `activity:${event.engine}`;
      const activePolicy = policy.getPolicyFor(policyScope, atIso);
      const charge = engine(event, region, atIso, activePolicy || undefined);
      return res.json({
        ...charge,
        policyId: activePolicy?.policyId || null,
        policyVersion: activePolicy?.version || null,
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  // Activity charge endpoint
  app.post('/marp/activity/charge', async (req, res) => {
    const { accountId, walletId, event, region, at, idempotencyKey } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const entry = await (orch as any).recordUsage(accountId, walletId, event, region, at || new Date().toISOString(), idempotencyKey);
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e) { console.warn('persistence save failed', e.message); }
      res.json(entry);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // Subscription lifecycle endpoints
  app.get('/marp/subscription/plans', (req, res) => {
    void req;
    return res.json(DEFAULT_SUBSCRIPTION_PLANS);
  });

  app.post('/marp/subscription/create', async (req, res) => {
    const { accountId, walletId, planId, price, region, at, idempotencyKey, autoRenew } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const entry = await (orch as any).createSubscription(accountId, walletId, planId, price, region, at || new Date().toISOString(), idempotencyKey, !!autoRenew);
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e) { console.warn('persistence save failed', e.message); }

      res.json(entry);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post('/marp/subscription/renew', async (req, res) => {
    const { accountId, at, idempotencyKey } = req.body;
    try {
      const entry = await (orch as any).renewSubscription(accountId, at || new Date().toISOString(), idempotencyKey);
      try {
        if ((persistence as any).saveLedgerEntry) await (persistence as any).saveLedgerEntry(entry);
        else await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (err) { console.warn('persistence save failed', (err as any).message); }
      res.json(entry);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post('/marp/subscription/upgrade', async (req, res) => {
    const { accountId, walletId, newPlanId, newPrice, at, idempotencyKey } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const result = await (orch as any).upgradeSubscription(accountId, walletId, newPlanId, newPrice, at || new Date().toISOString(), idempotencyKey);
      // result may be a ledger entry or a scheduling note
      if (result && (persistence as any).saveLedgerEntry && result.entryId) {
        try { await (persistence as any).saveLedgerEntry(result); } catch (e) { /* ignore */ }
      }
      // persist subscription state is handled by orchestrator when persistence is available
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post('/marp/subscription/cancel', async (req, res) => {
    const { accountId } = req.body;
    try {
      const result = await (orch as any).cancelSubscription(accountId);
      res.json(result);
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.get('/marp/subscription/:accountId', (req, res) => {
    const { accountId } = req.params;
    const sub = (orch as any).getSubscription(accountId);
    if (!sub) return res.status(404).json({ error: 'not_found' });
    res.json(sub);
  });

  // Policy lifecycle: create (MARP-signed) and deprecate
  app.post('/marp/policy', async (req, res) => {
    const p = req.body as Policy;
    try {
      // sign via MARP KMS if available
      let signed = p;
      try { signed = await marp.signPolicy(p) as Policy; } catch (e) { /* fallback to provided signature */ }
      policy.addPolicy(signed);
      // persist
      try {
        if ((persistence as any).savePolicy) await (persistence as any).savePolicy(signed);
        else {
          const all = await (persistence as JSONPersistence).loadPolicies();
          const idx = all.findIndex((x) => x.policyId === signed.policyId && x.version === signed.version);
          if (idx >= 0) all[idx] = signed; else all.push(signed);
          await (persistence as JSONPersistence).savePolicies(all);
        }
      } catch (e) { console.warn('policy persistence failed', e.message); }
      res.json({ ok: true, id: `${signed.policyId}@${signed.version}` });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post('/marp/policy/deprecate', async (req, res) => {
    const { policyId, version, effectiveUntil } = req.body as { policyId: string; version: string; effectiveUntil: string };
    try {
      policy.deprecatePolicy(policyId, version, effectiveUntil);
      const p = policy.getAllPolicies().find((x) => x.policyId === policyId && x.version === version);
      if (!p) throw new Error('policy_not_found');
      if ((persistence as any).savePolicy) await (persistence as any).savePolicy(p);
      else {
        const all = await (persistence as JSONPersistence).loadPolicies();
        const idx = all.findIndex((x) => x.policyId === p.policyId && x.version === p.version);
        if (idx >= 0) all[idx] = p; else all.push(p);
        await (persistence as JSONPersistence).savePolicies(all);
      }
      res.json({ ok: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  return app;
}

  if (require.main === module) {
  createServer().then((app) => {
    const port = process.env.PORT || 3100;
    app.listen(port, () => console.log(`MARP Billing Server listening on ${port}`));
  });
}

export { createServer };
