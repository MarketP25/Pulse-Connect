import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
// OpenAPI + validation
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import OpenApiValidator from "express-openapi-validator";
import path from "path";
import { PolicyRegistry } from "./policyRegistry";
import { LedgerEntry, Policy, WalletRecord } from "./types";
import { LedgerService } from "./ledger";
import { WalletService } from "./wallet";
import { Orchestrator } from "./orchestrator";
import { JSONPersistence } from "./persistence";
import { PostgresPersistence } from "./persistence_pg";
import { MARPKV } from "./kms";

const DEFAULT_SUBSCRIPTION_PLANS = [
  { planId: "basic", priceUsd: 29 },
  { planId: "premium", priceUsd: 99 },
  { planId: "enterprise", priceUsd: 349 }
];

type EmergencyControls = {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
};

type EmergencySnapshot = {
  active: boolean;
  protocolId?: string;
  severity?: "elevated" | "critical" | "lockdown";
  controls: EmergencyControls;
};

const DEFAULT_EMERGENCY_SNAPSHOT: EmergencySnapshot = {
  active: false,
  controls: {
    disableMajorFeatures: false,
    disabledFeatures: [],
    freezeTransactions: false,
    freezeWalletPayouts: false,
    blockedRegions: [],
    blockedIpRanges: [],
    allowFounderBypass: true
  }
};

let cachedEmergencySnapshot: EmergencySnapshot | null = null;
let emergencyCacheExpiresAt = 0;

function normalizeEmergencySnapshot(payload: unknown): EmergencySnapshot {
  const value =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const controls =
    typeof value.controls === "object" && value.controls !== null
      ? (value.controls as Record<string, unknown>)
      : {};

  return {
    active: Boolean(value.active),
    protocolId: typeof value.protocolId === "string" ? value.protocolId : undefined,
    severity:
      value.severity === "elevated" ||
      value.severity === "critical" ||
      value.severity === "lockdown"
        ? value.severity
        : undefined,
    controls: {
      disableMajorFeatures: Boolean(controls.disableMajorFeatures),
      disabledFeatures: Array.isArray(controls.disabledFeatures)
        ? controls.disabledFeatures
            .map((entry) => String(entry).trim().toLowerCase())
            .filter(Boolean)
        : [],
      freezeTransactions: Boolean(controls.freezeTransactions),
      freezeWalletPayouts: Boolean(controls.freezeWalletPayouts),
      blockedRegions: Array.isArray(controls.blockedRegions)
        ? controls.blockedRegions.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean)
        : [],
      blockedIpRanges: Array.isArray(controls.blockedIpRanges)
        ? controls.blockedIpRanges.map((entry) => String(entry).trim()).filter(Boolean)
        : [],
      allowFounderBypass: controls.allowFounderBypass !== false
    }
  };
}

async function fetchEmergencySnapshot(): Promise<EmergencySnapshot> {
  const now = Date.now();
  if (cachedEmergencySnapshot && now < emergencyCacheExpiresAt) {
    return cachedEmergencySnapshot;
  }

  const gatewayBase = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
  const url = `${gatewayBase.replace(/\/$/, "")}/api/admin/emergency-protocol?scope=enforcement`;
  const headers: Record<string, string> = {};
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    headers["x-internal-service-token"] = process.env.INTERNAL_SERVICE_TOKEN;
    headers.authorization = `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`;
  }

  try {
    const response = await fetch(url, { method: "GET", headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`emergency_snapshot_status_${response.status}`);
    }
    const snapshot = normalizeEmergencySnapshot(await response.json());
    cachedEmergencySnapshot = snapshot;
    emergencyCacheExpiresAt = now + Number(process.env.EMERGENCY_POLICY_CACHE_MS || 5000);
    return snapshot;
  } catch (error) {
    // Fail closed in production for financial operations.
    if (process.env.NODE_ENV === "production") {
      const failSafe = {
        ...DEFAULT_EMERGENCY_SNAPSHOT,
        active: true,
        controls: {
          ...DEFAULT_EMERGENCY_SNAPSHOT.controls,
          freezeTransactions: true,
          freezeWalletPayouts: true,
          allowFounderBypass: false
        }
      };
      cachedEmergencySnapshot = failSafe;
      emergencyCacheExpiresAt = now + 1000;
      return failSafe;
    }
    if (cachedEmergencySnapshot) return cachedEmergencySnapshot;
    return DEFAULT_EMERGENCY_SNAPSHOT;
  }
}

function hasFounderBypassHeaders(req: express.Request, controls: EmergencyControls): boolean {
  if (!controls.allowFounderBypass) return false;
  return Boolean(req.headers["x-pc365"] && req.headers["x-founder"] && req.headers["x-device"]);
}

function resolveRequestRegion(req: express.Request): string {
  const fromBody = typeof req.body?.region === "string" ? req.body.region : "";
  const fromHeader =
    typeof req.headers["x-geo-country"] === "string" ? req.headers["x-geo-country"] : "";
  return (fromBody || fromHeader || "").toUpperCase();
}

function isTransactionRoute(req: express.Request): boolean {
  if (req.method !== "POST") return false;
  const path = req.path.toLowerCase();
  return (
    path === "/marp/billing/charge" ||
    path === "/marp/activity/charge" ||
    path === "/marp/subscription/create" ||
    path === "/marp/subscription/renew" ||
    path === "/marp/subscription/upgrade"
  );
}

function resolveRequestIp(req: express.Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    const first = forwardedFor
      .split(",")
      .map((entry) => entry.trim())
      .find(Boolean);
    if (first) return first;
  }

  if (Array.isArray(forwardedFor)) {
    const first = forwardedFor
      .flatMap((value) => value.split(","))
      .map((entry) => entry.trim())
      .find(Boolean);
    if (first) return first;
  }

  const direct =
    req.headers["x-real-ip"] ||
    req.headers["x-client-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.ip ||
    "";
  if (Array.isArray(direct)) {
    return String(direct[0] || "").trim();
  }
  return String(direct || "").trim();
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    result = (result << 8) + n;
  }
  return result >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [rangeIp, prefixRaw] = cidr.split("/");
  const prefix = Number(prefixRaw);
  if (!rangeIp || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;

  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(rangeIp);
  if (ipInt === null || rangeInt === null) return false;

  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

function isBlockedIp(ip: string, blockedRanges: string[]): boolean {
  if (!ip || blockedRanges.length === 0) return false;
  return blockedRanges.some((range) => {
    if (range.includes("/")) return isIpInCidr(ip, range);
    return range === ip;
  });
}

function isFeatureDisabled(pathname: string, disabledFeatures: string[]): boolean {
  const signal = pathname.toLowerCase();
  return disabledFeatures.some((feature) => feature === "*" || signal.includes(feature));
}

function isWalletPayoutPath(pathname: string): boolean {
  return /(payout|withdraw|cashout|disburse|remittance)/i.test(pathname);
}

function isAuthorizedEmergencyMutationRequest(req: express.Request): boolean {
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!internalToken) {
    return process.env.NODE_ENV !== "production";
  }

  const providedToken = req.header("x-internal-service-token");
  if (providedToken === internalToken) return true;

  const authorization = req.header("authorization") || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length) === internalToken;
  }

  return false;
}

async function createServer(persistenceOverride?: JSONPersistence | PostgresPersistence) {
  const marp = new MARPKV();
  let persistence: JSONPersistence | PostgresPersistence = new JSONPersistence();
  if (persistenceOverride) {
    persistence = persistenceOverride;
    try {
      if (typeof (persistence as JSONPersistence | PostgresPersistence).connect === "function") {
        await (persistence as JSONPersistence | PostgresPersistence).connect();
      }
    } catch (e) {
      // ignore
    }
  } else if (process.env.DATABASE_URL) {
    const pg = new PostgresPersistence(process.env.DATABASE_URL);
    await pg.connect();
    persistence = pg;
  }

  const policy = new PolicyRegistry(marp);
  const ledger = new LedgerService();
  const wallet = new WalletService();
  const orch = new Orchestrator(policy, ledger, wallet, persistence);

  // hydrate from persistence
  const persistedPolicies = await persistence.loadPolicies();
  for (const p of persistedPolicies) {
    try {
      policy.addPolicy(p);
    } catch (e: unknown) {
      console.warn("skipping invalid policy", e instanceof Error ? e.message : String(e));
    }
  }
  const persistedOffers = await persistence.loadOffers();
  for (const o of persistedOffers) policy.addOffer(o);
  const persistedWallets = await persistence.loadWallets();
  for (const w of persistedWallets) wallet.createWallet(w.walletId, w.accountId, w.balance);
  const persistedLedger = await persistence.loadLedger();
  for (const e of persistedLedger) ledger.append(e as LedgerEntry);
  // load persisted subscriptions (if any)
  if ((persistence as any).loadSubscriptions) {
    try {
      const subs = await (persistence as any).loadSubscriptions();
      if (subs && subs.length) (orch as any).importSubscriptions(subs);
    } catch (e: unknown) {
      console.warn("failed loading subscriptions", e instanceof Error ? e.message : String(e));
    }
  }

  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.post("/internal/emergency-protocol/event", (req, res) => {
    if (!isAuthorizedEmergencyMutationRequest(req)) {
      return res.status(401).json({
        error: "UNAUTHORIZED_INTERNAL_EVENT",
        message: "Invalid internal token for emergency mutation event."
      });
    }

    const body =
      typeof req.body === "object" && req.body !== null
        ? (req.body as Record<string, unknown>)
        : {};
    const eventType =
      typeof body.eventType === "string" ? body.eventType : "emergency_protocol_mutated";
    if (eventType !== "emergency_protocol_mutated") {
      return res.status(400).json({
        error: "UNSUPPORTED_EVENT_TYPE",
        message: `Unsupported eventType ${eventType}.`
      });
    }

    const snapshot = normalizeEmergencySnapshot({
      active: body.active,
      protocolId: body.protocolId,
      severity: body.severity,
      controls: body.controls
    });
    cachedEmergencySnapshot = snapshot;
    emergencyCacheExpiresAt = Date.now() + Number(process.env.EMERGENCY_POLICY_CACHE_MS || 5000);

    return res.json({
      accepted: true,
      protocolId: snapshot.protocolId || null,
      active: snapshot.active,
      receivedAt: new Date().toISOString()
    });
  });

  app.use(async (req, res, next) => {
    if (!isTransactionRoute(req)) {
      return next();
    }

    try {
      const snapshot = await fetchEmergencySnapshot();
      if (!snapshot.active) {
        return next();
      }

      if (hasFounderBypassHeaders(req, snapshot.controls)) {
        return next();
      }

      const requestPath = req.path.toLowerCase();
      const requestIp = resolveRequestIp(req);
      if (requestIp && isBlockedIp(requestIp, snapshot.controls.blockedIpRanges)) {
        return res.status(423).json({
          error: "EMERGENCY_PROTOCOL_ACTIVE",
          control: "blocked-ip-ranges",
          message: "Emergency protocol blocked billing actions from this IP range.",
          protocolId: snapshot.protocolId || null
        });
      }

      const region = resolveRequestRegion(req);
      if (region && snapshot.controls.blockedRegions.includes(region)) {
        return res.status(423).json({
          error: "EMERGENCY_PROTOCOL_ACTIVE",
          control: "blocked-regions",
          message: `Emergency protocol blocked billing actions in region ${region}.`,
          protocolId: snapshot.protocolId || null
        });
      }

      if (isFeatureDisabled(requestPath, snapshot.controls.disabledFeatures)) {
        return res.status(423).json({
          error: "EMERGENCY_PROTOCOL_ACTIVE",
          control: "disabled-features",
          message: "Emergency protocol disabled this billing feature.",
          protocolId: snapshot.protocolId || null
        });
      }

      if (snapshot.controls.freezeWalletPayouts && isWalletPayoutPath(requestPath)) {
        return res.status(423).json({
          error: "EMERGENCY_PROTOCOL_ACTIVE",
          control: "freeze-wallet-payouts",
          message: "Emergency protocol currently freezes wallet payout operations.",
          protocolId: snapshot.protocolId || null
        });
      }

      if (snapshot.controls.disableMajorFeatures || snapshot.controls.freezeTransactions) {
        return res.status(423).json({
          error: "EMERGENCY_PROTOCOL_ACTIVE",
          control: snapshot.controls.disableMajorFeatures
            ? "disable-major-features"
            : "freeze-transactions",
          message: "Emergency protocol currently blocks transaction processing.",
          protocolId: snapshot.protocolId || null
        });
      }

      return next();
    } catch (error) {
      return res.status(423).json({
        error: "EMERGENCY_PROTOCOL_UNAVAILABLE",
        message: "Billing emergency policy check failed closed."
      });
    }
  });

  async function ensureWalletRecord(walletId: string, accountId: string): Promise<void> {
    const existing = wallet.get(walletId);
    if (existing) return;
    const seedBalance = Number(process.env.MARP_DEFAULT_WALLET_BALANCE || 5000);
    const created = wallet.createWallet(walletId, accountId, seedBalance);
    try {
      if ((persistence as any).saveWallet) {
        await (persistence as any).saveWallet(created);
      } else {
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []) as WalletRecord[];
        await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
      }
    } catch (e: any) {
      console.warn("wallet persistence save failed", e.message);
    }
  }

  // Load OpenAPI spec and mount docs + request validator
  try {
    const apiSpec = YAML.load(path.join(__dirname, "..", "openapi.yaml"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(apiSpec));
    // install the validator (validates requests and responses against spec)
    await new OpenApiValidator({
      apiSpec,
      validateRequests: true,
      validateResponses: true
    }).install(app);
  } catch (e) {
    console.warn("OpenAPI validator not installed or spec not found", (e as any).message);
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
          const walletsArr = Array.from(
            (wallet as any).wallets?.values?.() || []
          ) as WalletRecord[];
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
      const entry = orch.chargeSubscription(
        accountId,
        walletId,
        planId,
        price,
        region,
        at || new Date().toISOString(),
        idempotencyKey
      );
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          // persist individual entry to Postgres
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []) as WalletRecord[];
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e) {
        console.warn("persistence save failed", e instanceof Error ? e.message : String(e));
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
  app.post("/marp/activity/calculate", async (req, res) => {
    const { event, region, at } = req.body || {};
    if (!event || !event.engine) {
      return res.status(400).json({ error: "event_and_engine_required" });
    }
    try {
      const atIso = at || new Date().toISOString();
      const { getEngine } = await import("./activity");
      const engine = getEngine(event.engine);
      const policyScope = `activity:${event.engine}`;
      const activePolicy = policy.getPolicyFor(policyScope, atIso);
      const charge = engine(event, region, atIso, activePolicy || undefined);
      return res.json({
        ...charge,
        policyId: activePolicy?.policyId || null,
        policyVersion: activePolicy?.version || null
      });
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  // Activity charge endpoint
  app.post("/marp/activity/charge", async (req, res) => {
    const { accountId, walletId, event, region, at, idempotencyKey } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const entry = await (orch as any).recordUsage(
        accountId,
        walletId,
        event,
        region,
        at || new Date().toISOString(),
        idempotencyKey
      );
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []) as WalletRecord[];
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e: unknown) {
        console.warn("persistence save failed", e instanceof Error ? e.message : String(e));
      }
      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Subscription lifecycle endpoints
  app.get("/marp/subscription/plans", (req, res) => {
    void req;
    return res.json(DEFAULT_SUBSCRIPTION_PLANS);
  });

  app.post("/marp/subscription/create", async (req, res) => {
    const { accountId, walletId, planId, price, region, at, idempotencyKey, autoRenew } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const entry = await (orch as any).createSubscription(
        accountId,
        walletId,
        planId,
        price,
        region,
        at || new Date().toISOString(),
        idempotencyKey,
        !!autoRenew
      );
      // persist ledger + wallets
      try {
        if ((persistence as any).saveLedgerEntry) {
          await (persistence as any).saveLedgerEntry(entry);
        } else {
          await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        }
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []) as WalletRecord[];
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (e: unknown) {
        console.warn("persistence save failed", e instanceof Error ? e.message : String(e));
      }

      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/marp/subscription/renew", async (req, res) => {
    const { accountId, at, idempotencyKey } = req.body;
    try {
      const entry = await (orch as any).renewSubscription(
        accountId,
        at || new Date().toISOString(),
        idempotencyKey
      );
      try {
        if ((persistence as any).saveLedgerEntry) await (persistence as any).saveLedgerEntry(entry);
        else await (persistence as JSONPersistence).saveLedger(ledger.all()).catch(() => {});
        const walletsArr = Array.from((wallet as any).wallets?.values?.() || []);
        if ((persistence as any).saveWallet) {
          for (const w of walletsArr) await (persistence as any).saveWallet(w);
        } else {
          await (persistence as JSONPersistence).saveWallets(walletsArr).catch(() => {});
        }
      } catch (err) {
        console.warn("persistence save failed", err instanceof Error ? err.message : String(err));
      }
      res.json(entry);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/marp/subscription/upgrade", async (req, res) => {
    const { accountId, walletId, newPlanId, newPrice, at, idempotencyKey } = req.body;
    if (!accountId || !walletId) {
      return res.status(400).json({ error: "accountId_and_walletId_required" });
    }
    try {
      await ensureWalletRecord(walletId, accountId);
      const result = await (orch as any).upgradeSubscription(
        accountId,
        walletId,
        newPlanId,
        newPrice,
        at || new Date().toISOString(),
        idempotencyKey
      );
      // result may be a ledger entry or a scheduling note
      if (result && (persistence as any).saveLedgerEntry && result.entryId) {
        try {
          await (persistence as any).saveLedgerEntry(result);
        } catch (e) {
          /* ignore */
        }
      }
      // persist subscription state is handled by orchestrator when persistence is available
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/marp/subscription/cancel", async (req, res) => {
    const { accountId } = req.body;
    try {
      const result = await (orch as any).cancelSubscription(accountId);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/marp/subscription/:accountId", (req, res) => {
    const { accountId } = req.params;
    const sub = (orch as any).getSubscription(accountId);
    if (!sub) return res.status(404).json({ error: "not_found" });
    res.json(sub);
  });

  // Policy lifecycle: create (MARP-signed) and deprecate
  app.post("/marp/policy", async (req, res) => {
    const p = req.body as Policy;
    try {
      // sign via MARP KMS if available
      let signed = p;
      try {
        signed = (await marp.signPolicy(p)) as Policy;
      } catch (e) {
        /* fallback to provided signature */
      }
      policy.addPolicy(signed);
      // persist
      try {
        if ((persistence as any).savePolicy) await (persistence as any).savePolicy(signed);
        else {
          const all = await (persistence as JSONPersistence).loadPolicies();
          const idx = all.findIndex(
            (x) => x.policyId === signed.policyId && x.version === signed.version
          );
          if (idx >= 0) all[idx] = signed;
          else all.push(signed);
          await (persistence as JSONPersistence).savePolicies(all);
        }
      } catch (e) {
        console.warn("policy persistence failed", e instanceof Error ? e.message : String(e));
      }
      res.json({ ok: true, id: `${signed.policyId}@${signed.version}` });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/marp/policy/deprecate", async (req, res) => {
    const { policyId, version, effectiveUntil } = req.body as {
      policyId: string;
      version: string;
      effectiveUntil: string;
    };
    try {
      policy.deprecatePolicy(policyId, version, effectiveUntil);
      const p = policy
        .getAllPolicies()
        .find((x) => x.policyId === policyId && x.version === version);
      if (!p) throw new Error("policy_not_found");
      if ((persistence as any).savePolicy) await (persistence as any).savePolicy(p);
      else {
        const all = await (persistence as JSONPersistence).loadPolicies();
        const idx = all.findIndex((x) => x.policyId === p.policyId && x.version === p.version);
        if (idx >= 0) all[idx] = p;
        else all.push(p);
        await (persistence as JSONPersistence).savePolicies(all);
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
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
