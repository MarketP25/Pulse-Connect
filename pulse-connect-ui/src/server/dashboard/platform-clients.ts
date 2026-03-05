import {
  DashboardBillingModule,
  DashboardContract,
  DashboardFraudModule,
  DashboardGovernanceModule,
  DashboardIdentityModule,
  DashboardMatchmakingOperationsModule,
  DashboardPlacesOperationsModule,
  DashboardProximityAdvancedModule,
  DashboardReportingModule,
  DashboardTier,
} from "@/types/dashboard";

type JsonRecord = Record<string, unknown>;
type BillingAction = "create" | "renew" | "upgrade" | "cancel";
type BillingActivityEngine = "ecommerce" | "matchmaking" | "places" | "communication" | "pap_v1" | "ai_programs" | "localization";

type BillingPlan = {
  tier: DashboardTier;
  planId: string;
  priceUsd: number;
};

const DEFAULT_BILLING_PLANS: BillingPlan[] = [
  { tier: "basic", planId: "basic", priceUsd: 29 },
  { tier: "premium", planId: "premium", priceUsd: 99 },
  { tier: "enterprise", planId: "enterprise", priceUsd: 349 },
];

const BILLING_REGION_BY_COUNTRY: Record<string, string> = {
  US: "Europe West 1",
  GB: "Europe West 1",
  KE: "Africa South 1",
  ZA: "Africa South 1",
  FR: "Europe West 1",
  DE: "Europe West 1",
  JP: "Asia East 1",
  SG: "Asia East 1",
  BR: "South America East 1",
  AE: "Middle East Central 1",
};

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function parseJsonRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui",
        ...(init?.headers || {}),
      },
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json().catch(() => null)) as T | null;
  } catch {
    return null;
  }
}

async function requestJsonOrThrow<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-pulsco-source-app": "@pulsco/pulse-connect-ui",
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const details =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as Record<string, unknown>).error)
        : `status_${response.status}`;
    throw new Error(`billing_request_failed:${details}`);
  }
  return payload as T;
}

function numberFrom(value: unknown, fallback = 0): number {
  return typeof value === "number" ? value : fallback;
}

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toIsoNow(): string {
  return new Date().toISOString();
}

function isKnownTier(value: unknown): value is DashboardTier {
  return value === "basic" || value === "premium" || value === "enterprise";
}

function planIdToTier(planId: string): DashboardTier {
  if (planId.includes("enterprise")) {
    return "enterprise";
  }
  if (planId.includes("premium") || planId.includes("pro")) {
    return "premium";
  }
  return "basic";
}

function toDashboardSubscriptionStatus(
  value: unknown,
): "active" | "pending" | "cancelled" | "expired" {
  if (value === "active") {
    return "active";
  }
  if (value === "pending" || value === "pending_change") {
    return "pending";
  }
  if (value === "cancelled" || value === "canceled") {
    return "cancelled";
  }
  if (value === "expired" || value === "closed") {
    return "expired";
  }
  return "active";
}

function resolveBillingRegion(countryCodeOrRegion: string): string {
  if (!countryCodeOrRegion) {
    return "Europe West 1";
  }
  if (countryCodeOrRegion.includes(" ")) {
    return countryCodeOrRegion;
  }
  return BILLING_REGION_BY_COUNTRY[countryCodeOrRegion.toUpperCase()] || "Europe West 1";
}

function resolveBillingPlanTierInput(payload?: JsonRecord): DashboardTier {
  if (payload && isKnownTier(payload.tier)) {
    return payload.tier;
  }
  if (typeof payload?.planId === "string") {
    return planIdToTier(payload.planId.toLowerCase());
  }
  if (typeof payload?.newPlanId === "string") {
    return planIdToTier(payload.newPlanId.toLowerCase());
  }
  return "basic";
}

function getReportingBaseUrl(): string {
  return process.env.PULSCO_REPORTING_API_URL || process.env.PULSCO_REPORTING_ENGINE_URL || "";
}

function getIdentityBaseUrl(): string {
  return process.env.PULSCO_IDENTITY_API_URL || process.env.PULSE_INTELLIGENCE_CORE_URL || "";
}

function getBillingBaseUrl(): string {
  return process.env.PULSCO_BILLING_API_URL || process.env.BILLING_ENGINE_URL || "";
}

export function isBillingServiceConfigured(): boolean {
  return Boolean(getBillingBaseUrl());
}

export function getBillingWalletId(userId: string): string {
  return `wallet-${userId}`;
}

function getPlacesBaseUrl(): string {
  return process.env.PULSCO_PLACES_API_URL || process.env.PULSE_CONNECT_CORE_PLACES_URL || "";
}

function getMatchmakingBaseUrl(): string {
  return process.env.PULSCO_MATCHMAKING_API_URL || process.env.PULSE_CONNECT_CORE_MATCHMAKING_URL || "";
}

function getMARPObservabilityBaseUrl(): string {
  return process.env.PULSCO_MARP_OBSERVABILITY_API_URL || "";
}

function getMARPGovernanceBaseUrl(): string {
  return process.env.PULSCO_MARP_GOVERNANCE_API_URL || "";
}

function getMARPArbitrationBaseUrl(): string {
  return process.env.PULSCO_MARP_ARBITRATION_API_URL || "";
}

function getLocalizationBaseUrl(): string {
  return process.env.PULSCO_LOCALIZATION_API_URL || process.env.LOCALIZATION_API_URL || "";
}

function getProximityBaseUrl(): string {
  return process.env.PULSCO_PROXIMITY_API_URL || process.env.PROXIMITY_API_URL || "http://localhost:3002/api/v1/proximity";
}

export async function fetchReportingServiceData(userId: string): Promise<Partial<DashboardReportingModule> | null> {
  const base = getReportingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);

  const [summary, trends, latency, anomalies] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/reports/revenue/summary`),
    requestJson<JsonRecord>(`${normalized}/reports/revenue/trends`),
    requestJson<JsonRecord>(`${normalized}/reports/performance/latency`),
    requestJson<JsonRecord>(`${normalized}/reports/fraud/anomalies`),
  ]);

  return {
    source: "reporting-engine",
    refreshedAt: toIsoNow(),
    revenueSummary: {
      grossUsd: numberFrom(summary?.gross ?? summary?.grossUsd),
      netUsd: numberFrom(summary?.net ?? summary?.netUsd),
      orders: numberFrom(summary?.orders),
      currency: stringFrom(summary?.currency, "USD"),
      period: stringFrom(summary?.period, "last_30_days"),
    },
    revenueTrends: Array.isArray(trends?.points)
      ? trends.points
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              label: stringFrom(value.label),
              value: numberFrom(value.value),
            };
          })
          .filter(Boolean) as Array<{ label: string; value: number }>
      : [],
    performanceLatencyMs: numberFrom(latency?.avgLatencyMs ?? latency?.latencyMs),
    anomalies: Array.isArray(anomalies?.anomalies)
      ? anomalies.anomalies
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              type: stringFrom(value.type, "fraud"),
              severity:
                value.severity === "low" || value.severity === "medium" || value.severity === "high" || value.severity === "critical"
                  ? value.severity
                  : "medium",
              message: stringFrom(value.message, "Fraud anomaly reported"),
              detectedAt: stringFrom(value.detectedAt, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardReportingModule["anomalies"]
      : [],
    // Keep userId in payload for request tracing in log viewers.
    ...(userId ? {} : {}),
  };
}

export async function fetchFraudServiceData(userId: string): Promise<Partial<DashboardFraudModule> | null> {
  const base = getReportingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const [riskScore, anomalies] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/fraud/risk-score/${encodeURIComponent(userId)}`),
    requestJson<JsonRecord>(`${normalized}/fraud/anomalies`),
  ]);

  return {
    source: "reporting-engine",
    refreshedAt: toIsoNow(),
    riskScore: numberFrom(riskScore?.riskScore, 0),
    anomalies: Array.isArray(anomalies?.anomalies)
      ? anomalies.anomalies
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              type: stringFrom(value.type, "fraud"),
              severity:
                value.severity === "low" || value.severity === "medium" || value.severity === "high" || value.severity === "critical"
                  ? value.severity
                  : "medium",
              message: stringFrom(value.message, "Fraud anomaly reported"),
              detectedAt: stringFrom(value.detectedAt, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardFraudModule["anomalies"]
      : [],
  };
}

export async function fetchIdentityServiceData(userId: string): Promise<Partial<DashboardIdentityModule> | null> {
  const base = getIdentityBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);

  const [history, twoFactor] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/accounts/${encodeURIComponent(userId)}/history`),
    requestJson<JsonRecord>(`${normalized}/auth/2fa/generate?userId=${encodeURIComponent(userId)}`),
  ]);

  return {
    source: "identity-service",
    refreshedAt: toIsoNow(),
    twoFactorEnabled: Boolean(twoFactor?.enabled),
    onboardingRequiredActions: Array.isArray(history?.requiredActions)
      ? history.requiredActions.map((item) => String(item))
      : [],
    sessions: Array.isArray(history?.sessions)
      ? history.sessions
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              device: stringFrom(value.device, "Unknown device"),
              ipMasked: stringFrom(value.ipMasked, "0.0.xxx.xxx"),
              createdAt: stringFrom(value.createdAt, toIsoNow()),
              lastSeenAt: stringFrom(value.lastSeenAt, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardIdentityModule["sessions"]
      : [],
    history: Array.isArray(history?.history)
      ? history.history
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              action: stringFrom(value.action),
              actor: stringFrom(value.actor, "identity-service"),
              at: stringFrom(value.at, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardIdentityModule["history"]
      : [],
  };
}

export async function fetchBillingServiceData(userId: string): Promise<Partial<DashboardBillingModule> | null> {
  const base = getBillingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const [subscription, ledger] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/marp/subscription/${encodeURIComponent(userId)}`),
    requestJson<unknown>(`${normalized}/marp/ledger/${encodeURIComponent(userId)}`),
  ]);

  const ledgerList = Array.isArray(ledger)
    ? ledger
    : Array.isArray(parseJsonRecord(ledger)?.entries)
    ? (parseJsonRecord(ledger)?.entries as unknown[])
    : [];

  const mappedLedger = ledgerList
    .map((item) => {
      const value = parseJsonRecord(item);
      if (!value) {
        return null;
      }
      return {
        id: stringFrom(value.entryId ?? value.id, `ledger-${Math.random().toString(36).slice(2, 9)}`),
        type: stringFrom(value.type, "charge"),
        amountUsd: numberFrom(value.amount ?? value.amountUsd),
        balanceUsd: numberFrom(value.balanceAfter ?? value.balanceUsd),
        createdAt: stringFrom(value.timestamp ?? value.createdAt, toIsoNow()),
      };
    })
    .filter(Boolean) as DashboardBillingModule["ledgerEntries"];

  const policyVersions = ledgerList
    .map((item) => parseJsonRecord(item))
    .filter(Boolean)
    .flatMap((entry) => {
      const version = entry?.policyVersion;
      if (typeof version !== "string" || !version) {
        return [];
      }
      return [version];
    })
    .filter((version, index, arr) => arr.indexOf(version) === index)
    .map((version, index) => ({
      version,
      status: index === 0 ? ("active" as const) : ("deprecated" as const),
      createdAt: toIsoNow(),
    }));

  const subscriptionPlanId = stringFrom(subscription?.planId ?? subscription?.tier, "basic").toLowerCase();
  const fallbackTier = planIdToTier(subscriptionPlanId);

  return {
    source: "billing-engine",
    refreshedAt: toIsoNow(),
    subscription: {
      tier: isKnownTier(subscription?.tier) ? subscription.tier : fallbackTier,
      status: toDashboardSubscriptionStatus(subscription?.status),
      region: stringFrom(subscription?.region, "Europe West 1"),
      renewalAt: stringFrom(subscription?.periodEnd ?? subscription?.renewalAt),
    },
    ledgerEntries: mappedLedger,
    policyVersions,
  };
}

export async function fetchBillingSubscriptionPlans(): Promise<BillingPlan[]> {
  const base = getBillingBaseUrl();
  if (!base) {
    return DEFAULT_BILLING_PLANS;
  }
  const normalized = normalizeBaseUrl(base);
  const payload = await requestJson<unknown>(`${normalized}/marp/subscription/plans`);

  if (!Array.isArray(payload)) {
    return DEFAULT_BILLING_PLANS;
  }

  const plans = payload
    .map((item) => {
      const value = parseJsonRecord(item);
      if (!value) {
        return null;
      }
      const planId = stringFrom(value.planId);
      const priceUsd = numberFrom(value.price ?? value.priceUsd);
      if (!planId || priceUsd <= 0) {
        return null;
      }
      return {
        tier: planIdToTier(planId.toLowerCase()),
        planId,
        priceUsd,
      } as BillingPlan;
    })
    .filter(Boolean) as BillingPlan[];

  return plans.length > 0 ? plans : DEFAULT_BILLING_PLANS;
}

export async function ensureBillingWallet(userId: string, seedBalanceUsd = 5000): Promise<string | null> {
  const base = getBillingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const walletId = getBillingWalletId(userId);
  await requestJsonOrThrow<JsonRecord>(`${normalized}/marp/wallet/create`, {
    method: "POST",
    body: JSON.stringify({
      walletId,
      accountId: userId,
      balance: Number(seedBalanceUsd.toFixed(2)),
    }),
  });
  return walletId;
}

export async function performBillingServiceAction(
  userId: string,
  action: BillingAction,
  payload?: JsonRecord,
): Promise<JsonRecord | null> {
  const base = getBillingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const walletId = stringFrom(payload?.walletId, getBillingWalletId(userId));
  const region = resolveBillingRegion(stringFrom(payload?.region, "US"));
  const tier = resolveBillingPlanTierInput(payload);
  const plans = await fetchBillingSubscriptionPlans();
  const selectedPlan = plans.find((plan) => plan.tier === tier) || DEFAULT_BILLING_PLANS.find((plan) => plan.tier === tier)!;

  await ensureBillingWallet(
    userId,
    numberFrom(payload?.walletSeedUsd, Number(process.env.PULSCO_DASHBOARD_BILLING_WALLET_SEED_USD || 5000)),
  );

  const endpoint =
    action === "create"
      ? "/marp/subscription/create"
      : action === "renew"
      ? "/marp/subscription/renew"
      : action === "upgrade"
      ? "/marp/subscription/upgrade"
      : "/marp/subscription/cancel";

  if (action === "create") {
    return requestJsonOrThrow<JsonRecord>(`${normalized}${endpoint}`, {
      method: "POST",
      body: JSON.stringify({
        accountId: userId,
        walletId,
        planId: stringFrom(payload?.planId, selectedPlan.planId),
        price: numberFrom(payload?.price, selectedPlan.priceUsd),
        region,
        autoRenew: payload?.autoRenew === true,
        idempotencyKey: stringFrom(payload?.idempotencyKey, `sub-create-${userId}-${Date.now()}`),
      }),
    });
  }

  if (action === "renew") {
    return requestJsonOrThrow<JsonRecord>(`${normalized}${endpoint}`, {
      method: "POST",
      body: JSON.stringify({
        accountId: userId,
        idempotencyKey: stringFrom(payload?.idempotencyKey, `sub-renew-${userId}-${Date.now()}`),
      }),
    });
  }

  if (action === "upgrade") {
    return requestJsonOrThrow<JsonRecord>(`${normalized}${endpoint}`, {
      method: "POST",
      body: JSON.stringify({
        accountId: userId,
        walletId,
        newPlanId: stringFrom(payload?.newPlanId, selectedPlan.planId),
        newPrice: numberFrom(payload?.newPrice, selectedPlan.priceUsd),
        idempotencyKey: stringFrom(payload?.idempotencyKey, `sub-upgrade-${userId}-${Date.now()}`),
      }),
    });
  }

  return requestJsonOrThrow<JsonRecord>(`${normalized}${endpoint}`, {
    method: "POST",
    body: JSON.stringify({
      accountId: userId,
    }),
  });
}

export async function calculateBillingActivity(input: {
  userId: string;
  region: string;
  event: {
    engine: BillingActivityEngine;
    eventId?: string;
    units?: number;
    amount?: number;
    details?: Record<string, unknown>;
  };
}): Promise<JsonRecord | null> {
  const base = getBillingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  return requestJsonOrThrow<JsonRecord>(`${normalized}/marp/activity/calculate`, {
    method: "POST",
    body: JSON.stringify({
      accountId: input.userId,
      region: resolveBillingRegion(input.region),
      event: input.event,
      at: toIsoNow(),
    }),
  });
}

export async function chargeBillingActivity(input: {
  userId: string;
  region: string;
  event: {
    engine: BillingActivityEngine;
    eventId?: string;
    units?: number;
    amount?: number;
    details?: Record<string, unknown>;
  };
  idempotencyKey?: string;
}): Promise<JsonRecord | null> {
  const base = getBillingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const walletId = await ensureBillingWallet(
    input.userId,
    Number(process.env.PULSCO_DASHBOARD_BILLING_WALLET_SEED_USD || 5000),
  );
  if (!walletId) {
    return null;
  }
  return requestJsonOrThrow<JsonRecord>(`${normalized}/marp/activity/charge`, {
    method: "POST",
    body: JSON.stringify({
      accountId: input.userId,
      walletId,
      region: resolveBillingRegion(input.region),
      event: input.event,
      at: toIsoNow(),
      idempotencyKey: input.idempotencyKey || `${input.event.engine}-${input.userId}-${Date.now()}`,
    }),
  });
}

export async function fetchPlacesServiceData(userId: string): Promise<Partial<DashboardPlacesOperationsModule> | null> {
  const base = getPlacesBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const [places, bookings] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/places`),
    requestJson<JsonRecord>(`${normalized}/bookings`),
  ]);

  return {
    source: "places-service",
    refreshedAt: toIsoNow(),
    places: Array.isArray(places?.data)
      ? places.data
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              name: stringFrom(value.name, "Place"),
              category: stringFrom(value.category, "workspace"),
              status:
                value.status === "draft" || value.status === "published" || value.status === "archived"
                  ? value.status
                  : "published",
              updatedAt: stringFrom(value.updatedAt, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardPlacesOperationsModule["places"]
      : [],
    bookings: Array.isArray(bookings?.data)
      ? bookings.data
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              placeId: stringFrom(value.placeId),
              status:
                value.status === "pending" || value.status === "confirmed" || value.status === "cancelled"
                  ? value.status
                  : "pending",
              startAt: stringFrom(value.startAt, toIsoNow()),
              endAt: stringFrom(value.endAt, toIsoNow()),
              totalUsd: numberFrom(value.totalUsd),
            };
          })
          .filter(Boolean) as DashboardPlacesOperationsModule["bookings"]
      : [],
    transactions: [],
  };
}

export async function performPlacesServiceAction(
  action: "create_place" | "create_booking" | "cancel_booking",
  payload: JsonRecord,
): Promise<JsonRecord | null> {
  const base = getPlacesBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);

  if (action === "create_place") {
    return requestJson<JsonRecord>(`${normalized}/places`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  if (action === "create_booking") {
    return requestJson<JsonRecord>(`${normalized}/bookings`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  const bookingId = stringFrom(payload.bookingId);
  if (!bookingId) {
    return null;
  }
  return requestJson<JsonRecord>(`${normalized}/bookings/${encodeURIComponent(bookingId)}`, {
    method: "DELETE",
    body: JSON.stringify({ reason: payload.reason || "dashboard_cancelled" }),
  });
}

export async function fetchMatchmakingServiceData(
  userId: string,
): Promise<Partial<DashboardMatchmakingOperationsModule> | null> {
  const base = getMatchmakingBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const reputation = await requestJson<JsonRecord>(`${normalized}/v1/users/${encodeURIComponent(userId)}/reputation`);

  const contracts: DashboardContract[] = Array.isArray(reputation?.contracts)
    ? reputation.contracts
        .map((item) => {
          const value = parseJsonRecord(item);
          if (!value) {
            return null;
          }
          return {
            id: stringFrom(value.id),
            proposalId: stringFrom(value.proposalId),
            status:
              value.status === "draft" || value.status === "active" || value.status === "completed" || value.status === "cancelled"
                ? value.status
                : "draft",
            createdAt: stringFrom(value.createdAt, toIsoNow()),
          };
        })
        .filter(Boolean) as DashboardContract[]
    : [];

  return {
    source: "matchmaking-service",
    refreshedAt: toIsoNow(),
    briefs: [],
    proposals: [],
    contracts,
  };
}

export async function fetchGovernanceServiceData(userId: string): Promise<Partial<DashboardGovernanceModule> | null> {
  const observabilityBase = getMARPObservabilityBaseUrl();
  const governanceBase = getMARPGovernanceBaseUrl();
  const arbitrationBase = getMARPArbitrationBaseUrl();

  if (!observabilityBase && !governanceBase && !arbitrationBase) {
    return null;
  }

  const [summary, firewallRules, arbitrations] = await Promise.all([
    observabilityBase
      ? requestJson<JsonRecord>(`${normalizeBaseUrl(observabilityBase)}/dashboard/summary`)
      : Promise.resolve(null),
    governanceBase
      ? requestJson<JsonRecord>(`${normalizeBaseUrl(governanceBase)}/marp/firewall/rules`)
      : Promise.resolve(null),
    arbitrationBase
      ? requestJson<JsonRecord>(`${normalizeBaseUrl(arbitrationBase)}/marp/arbitration/status/${encodeURIComponent(userId)}`)
      : Promise.resolve(null),
  ]);

  return {
    source: "marp-services",
    refreshedAt: toIsoNow(),
    policyVersions: Array.isArray(summary?.policyVersions)
      ? summary.policyVersions.map((item) => String(item))
      : [],
    firewallRuleCount: Array.isArray(firewallRules) ? firewallRules.length : numberFrom(firewallRules?.count),
    arbitrations: Array.isArray(arbitrations)
      ? arbitrations
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              status:
                value.status === "pending" || value.status === "approved" || value.status === "rejected"
                  ? value.status
                  : "pending",
              createdAt: stringFrom(value.createdAt, toIsoNow()),
            };
          })
          .filter(Boolean) as DashboardGovernanceModule["arbitrations"]
      : [],
  };
}

export async function fetchProximityServiceData(): Promise<Partial<DashboardProximityAdvancedModule> | null> {
  const base = normalizeBaseUrl(getProximityBaseUrl());
  const [health, metrics, rules] = await Promise.all([
    requestJson<JsonRecord>(`${base}/health`),
    requestJson<JsonRecord>(`${base}/metrics`),
    requestJson<JsonRecord>(`${base}/rules`),
  ]);

  if (!health && !metrics && !rules) {
    return null;
  }

  return {
    source: "proximity-service",
    refreshedAt: toIsoNow(),
    health: {
      status:
        health?.status === "healthy" || health?.status === "degraded" || health?.status === "unhealthy"
          ? health.status
          : "healthy",
      latencyMs: numberFrom(health?.latencyMs, 0),
    },
    rules: Array.isArray(rules)
      ? rules
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              id: stringFrom(value.id),
              name: stringFrom(value.name),
              value: String(value.value ?? ""),
            };
          })
          .filter(Boolean) as DashboardProximityAdvancedModule["rules"]
      : [],
    metrics: Array.isArray(metrics?.items)
      ? metrics.items
          .map((item) => {
            const value = parseJsonRecord(item);
            if (!value) {
              return null;
            }
            return {
              name: stringFrom(value.name),
              value: numberFrom(value.value),
            };
          })
          .filter(Boolean) as DashboardProximityAdvancedModule["metrics"]
      : [],
  };
}

export async function fetchLocalizationHealthData(): Promise<{
  providerHealth?: Array<{ provider: string; status: "healthy" | "degraded" | "unhealthy"; latencyMs: number; errorRate: number }>;
  languageCoverage?: Array<{ language: string; regions: string[]; quality: "high" | "medium" | "low" }>;
} | null> {
  const base = getLocalizationBaseUrl();
  if (!base) {
    return null;
  }
  const normalized = normalizeBaseUrl(base);
  const [providerHealth, languages] = await Promise.all([
    requestJson<JsonRecord>(`${normalized}/providers/health`),
    requestJson<JsonRecord>(`${normalized}/languages`),
  ]);

  return {
    providerHealth: Array.isArray(providerHealth)
      ? providerHealth
          .map((entry) => {
            const value = parseJsonRecord(entry);
            if (!value) {
              return null;
            }
            return {
              provider: stringFrom(value.provider),
              status:
                value.status === "healthy" || value.status === "degraded" || value.status === "unhealthy"
                  ? value.status
                  : "healthy",
              latencyMs: numberFrom(value.latencyMs),
              errorRate: numberFrom(value.errorRate),
            };
          })
          .filter(Boolean) as Array<{
            provider: string;
            status: "healthy" | "degraded" | "unhealthy";
            latencyMs: number;
            errorRate: number;
          }>
      : [],
    languageCoverage: Array.isArray(languages)
      ? languages
          .map((entry) => {
            const value = parseJsonRecord(entry);
            if (!value) {
              return null;
            }
            return {
              language: stringFrom(value.language),
              regions: Array.isArray(value.regions) ? value.regions.map((region) => String(region)) : [],
              quality: value.quality === "high" || value.quality === "medium" || value.quality === "low" ? value.quality : "medium",
            };
          })
          .filter(Boolean) as Array<{
            language: string;
            regions: string[];
            quality: "high" | "medium" | "low";
          }>
      : [],
  };
}
