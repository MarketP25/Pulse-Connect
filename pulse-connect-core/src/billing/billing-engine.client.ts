type BillingActivityEngine =
  | "ecommerce"
  | "matchmaking"
  | "places"
  | "communication"
  | "pap_v1"
  | "ai_programs"
  | "localization";

export interface BillingActivityQuote {
  base: number;
  fees: number;
  subtotal: number;
  tax: number;
  total: number;
  description?: string;
  policyId?: string | null;
  policyVersion?: string | null;
}

export interface BillingActivityCharge {
  entryId: string;
  timestamp: string;
  accountId: string;
  walletId: string;
  amount: number;
  sourceEngine?: BillingActivityEngine;
  sourceEventId?: string;
  policyId?: string | null;
  policyVersion?: string | null;
  region?: string;
}

export interface BillingSubscriptionPlan {
  planId: string;
  priceUsd: number;
}

interface BillingWalletRecord {
  walletId: string;
  accountId: string;
  balance?: number;
}

function getBillingBaseUrl(): string {
  return process.env.PULSCO_BILLING_API_URL || process.env.BILLING_ENGINE_URL || "";
}

function normalizedBillingBaseUrl(): string {
  return getBillingBaseUrl().replace(/\/+$/, "");
}

function resolveBillingRegion(region: string): string {
  const normalized = (region || "").toLowerCase();
  if (normalized.includes("africa")) return "Africa South 1";
  if (normalized.includes("asia")) return "Asia East 1";
  if (normalized.includes("southamerica") || normalized.includes("south_america") || normalized.includes("latam")) {
    return "South America East 1";
  }
  if (normalized.includes("middleeast") || normalized.includes("me-")) return "Middle East Central 1";
  return "Europe West 1";
}

export function isBillingEngineConfigured(): boolean {
  return Boolean(getBillingBaseUrl());
}

function billingRequestTimeoutMs(): number {
  const raw = Number(process.env.PULSCO_BILLING_TIMEOUT_MS || 6000);
  return Number.isFinite(raw) && raw > 0 ? raw : 6000;
}

function billingWalletIdForAccount(accountId: string): string {
  const safe = (accountId || "unknown").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
  return `pulsco-core-${safe}`;
}

async function requestBillingJson<T>(path: string, init: RequestInit): Promise<T | null> {
  const base = normalizedBillingBaseUrl();
  if (!base) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), billingRequestTimeoutMs());

  try {
    const response = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        ...(init.headers || {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function ensureBillingWallet(accountId: string, walletId?: string): Promise<BillingWalletRecord | null> {
  if (!isBillingEngineConfigured()) return null;
  const resolvedWalletId = walletId || billingWalletIdForAccount(accountId);

  return requestBillingJson<BillingWalletRecord>("/marp/wallet/create", {
    method: "POST",
    body: JSON.stringify({
      walletId: resolvedWalletId,
      accountId,
      balance: Number(process.env.PULSCO_BILLING_WALLET_SEED_BALANCE || 0),
    }),
  });
}

export async function calculateBillingActivityQuote(input: {
  engine: BillingActivityEngine;
  amount?: number;
  units?: number;
  eventId?: string;
  details?: Record<string, unknown>;
  region?: string;
}): Promise<BillingActivityQuote | null> {
  return requestBillingJson<BillingActivityQuote>("/marp/activity/calculate", {
    method: "POST",
    body: JSON.stringify({
      region: resolveBillingRegion(input.region || "global"),
      event: {
        engine: input.engine,
        amount: input.amount,
        units: input.units,
        eventId: input.eventId,
        details: input.details,
      },
      at: new Date().toISOString(),
    }),
  });
}

export async function chargeBillingActivity(input: {
  accountId: string;
  walletId?: string;
  engine: BillingActivityEngine;
  amount?: number;
  units?: number;
  eventId?: string;
  details?: Record<string, unknown>;
  region?: string;
  idempotencyKey?: string;
}): Promise<BillingActivityCharge | null> {
  if (!isBillingEngineConfigured()) return null;

  const walletId = input.walletId || billingWalletIdForAccount(input.accountId);
  const wallet = await ensureBillingWallet(input.accountId, walletId);
  if (!wallet) return null;

  return requestBillingJson<BillingActivityCharge>("/marp/activity/charge", {
    method: "POST",
    body: JSON.stringify({
      accountId: input.accountId,
      walletId,
      region: resolveBillingRegion(input.region || "global"),
      event: {
        engine: input.engine,
        amount: input.amount,
        units: input.units,
        eventId: input.eventId,
        details: input.details,
      },
      at: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey || input.eventId,
    }),
  });
}

export async function chargeBillingSubscription(input: {
  accountId: string;
  walletId?: string;
  planId: string;
  price: number;
  region?: string;
  idempotencyKey?: string;
}): Promise<BillingActivityCharge | null> {
  if (!isBillingEngineConfigured()) return null;

  const walletId = input.walletId || billingWalletIdForAccount(input.accountId);
  const wallet = await ensureBillingWallet(input.accountId, walletId);
  if (!wallet) return null;

  return requestBillingJson<BillingActivityCharge>("/marp/billing/charge", {
    method: "POST",
    body: JSON.stringify({
      accountId: input.accountId,
      walletId,
      planId: input.planId,
      price: input.price,
      region: resolveBillingRegion(input.region || "global"),
      at: new Date().toISOString(),
      idempotencyKey: input.idempotencyKey,
    }),
  });
}

export async function fetchBillingSubscriptionPlans(): Promise<BillingSubscriptionPlan[] | null> {
  const plans = await requestBillingJson<Array<{ planId?: unknown; priceUsd?: unknown }>>("/marp/subscription/plans", {
    method: "GET",
  });
  if (!plans) return null;

  return plans
    .map((plan) => ({
      planId: typeof plan.planId === "string" ? plan.planId : "",
      priceUsd: typeof plan.priceUsd === "number" ? plan.priceUsd : Number(plan.priceUsd || 0),
    }))
    .filter((plan) => plan.planId.length > 0 && Number.isFinite(plan.priceUsd));
}
