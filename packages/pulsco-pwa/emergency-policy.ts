type EmergencySeverity = "elevated" | "critical" | "lockdown";

type EmergencyControls = {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
};

type EmergencyEnforcementSnapshot = {
  active: boolean;
  protocolId: string;
  severity: EmergencySeverity;
  controls: EmergencyControls;
  activatedAt?: string;
  lastUpdatedAt: string;
  riskScore?: number;
  anomaliesObserved?: number;
  correlationId?: string;
  source: string;
  version: number;
};

export type EmergencyBlockResult = {
  blocked: boolean;
  control?: string;
  message?: string;
  snapshot?: EmergencyEnforcementSnapshot;
};

const TRANSACTION_PATTERN =
  /(transaction|payment|wallet|billing|charge|refund|transfer|checkout|invoice|reserve|settlement|chargeback|purchase)/i;
const PAYOUT_PATTERN = /(payout|withdraw|cashout|disburse|remittance|treasury|settlement)/i;
const READ_ONLY_PATTERN = /(read|get|list|status|health|fetch|preview|query|metrics)/i;

const DEFAULT_SNAPSHOT: EmergencyEnforcementSnapshot = {
  active: false,
  protocolId: "",
  severity: "elevated",
  controls: {
    disableMajorFeatures: false,
    disabledFeatures: [],
    freezeTransactions: false,
    freezeWalletPayouts: false,
    blockedRegions: [],
    blockedIpRanges: [],
    allowFounderBypass: true
  },
  lastUpdatedAt: new Date(0).toISOString(),
  source: "policy-unavailable",
  version: 1
};

const FAIL_SAFE_SNAPSHOT: EmergencyEnforcementSnapshot = {
  active: true,
  protocolId: "failsafe-emergency-lock",
  severity: "critical",
  controls: {
    disableMajorFeatures: false,
    disabledFeatures: [],
    freezeTransactions: true,
    freezeWalletPayouts: true,
    blockedRegions: [],
    blockedIpRanges: [],
    allowFounderBypass: false
  },
  lastUpdatedAt: new Date().toISOString(),
  source: "policy-fetch-failsafe",
  version: 1
};

let cachedSnapshot: EmergencyEnforcementSnapshot | null = null;
let cacheExpiresAt = 0;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))
  );
}

function normalizeControls(value: unknown): EmergencyControls {
  const input = asRecord(value);
  return {
    disableMajorFeatures: Boolean(input.disableMajorFeatures),
    disabledFeatures: toStringArray(input.disabledFeatures).map((item) => item.toLowerCase()),
    freezeTransactions: Boolean(input.freezeTransactions),
    freezeWalletPayouts: Boolean(input.freezeWalletPayouts),
    blockedRegions: toStringArray(input.blockedRegions).map((item) => item.toUpperCase()),
    blockedIpRanges: toStringArray(input.blockedIpRanges),
    allowFounderBypass: input.allowFounderBypass !== false
  };
}

function normalizeSnapshot(value: unknown): EmergencyEnforcementSnapshot {
  const input = asRecord(value);
  const severityInput = input.severity;
  const severity: EmergencySeverity =
    severityInput === "elevated" || severityInput === "critical" || severityInput === "lockdown"
      ? severityInput
      : "critical";

  return {
    active: Boolean(input.active),
    protocolId: typeof input.protocolId === "string" ? input.protocolId : "",
    severity,
    controls: normalizeControls(input.controls),
    activatedAt: typeof input.activatedAt === "string" ? input.activatedAt : undefined,
    lastUpdatedAt:
      typeof input.lastUpdatedAt === "string" ? input.lastUpdatedAt : new Date().toISOString(),
    riskScore: typeof input.riskScore === "number" ? input.riskScore : undefined,
    anomaliesObserved:
      typeof input.anomaliesObserved === "number" ? input.anomaliesObserved : undefined,
    correlationId: typeof input.correlationId === "string" ? input.correlationId : undefined,
    source: typeof input.source === "string" ? input.source : "admin-gateway",
    version: typeof input.version === "number" ? input.version : 1
  };
}

function getPolicyUrl(): string {
  if (process.env.PULSCO_EMERGENCY_POLICY_URL) return process.env.PULSCO_EMERGENCY_POLICY_URL;

  const base = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
  return `${base}/api/admin/emergency-protocol?scope=enforcement`;
}

function getPolicyCacheMs(): number {
  const fromEnv = Number(process.env.PULSCO_EMERGENCY_POLICY_CACHE_MS || 5000);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5000;
}

async function fetchEnforcementSnapshot(): Promise<EmergencyEnforcementSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now < cacheExpiresAt) {
    return cachedSnapshot;
  }

  try {
    const headers = new Headers({
      "cache-control": "no-store"
    });

    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers.set("x-internal-service-token", process.env.INTERNAL_SERVICE_TOKEN);
    }

    const response = await fetch(getPolicyUrl(), {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Policy endpoint returned ${response.status}`);
    }

    const payload = normalizeSnapshot(await response.json());
    cachedSnapshot = payload;
    cacheExpiresAt = now + getPolicyCacheMs();
    return payload;
  } catch {
    if (cachedSnapshot) {
      // Use last known policy rather than silently failing open.
      return cachedSnapshot;
    }

    if (process.env.NODE_ENV === "production") {
      cachedSnapshot = FAIL_SAFE_SNAPSHOT;
      cacheExpiresAt = now + 1000;
      return FAIL_SAFE_SNAPSHOT;
    }

    cachedSnapshot = DEFAULT_SNAPSHOT;
    cacheExpiresAt = now + 1000;
    return DEFAULT_SNAPSHOT;
  }
}

function getRequestCountry(request: Request): string {
  const fromHeaders =
    request.headers.get("x-geo-country") ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code") ||
    "";

  return fromHeaders.trim().toUpperCase();
}

function getRequestIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);
    if (first) return first;
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-client-ip") ||
    request.headers.get("cf-connecting-ip") ||
    ""
  ).trim();
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
  if (!ip) return false;
  return blockedRanges.some((blocked) => {
    if (blocked.includes("/")) return isIpInCidr(ip, blocked);
    return blocked === ip;
  });
}

function payloadSignal(payload: Record<string, unknown>): string {
  return [
    payload.action,
    payload.operation,
    payload.subsystem,
    payload.domain,
    payload.feature,
    payload.target
  ]
    .filter((item) => typeof item === "string")
    .join(" ")
    .toLowerCase();
}

function hasFounderBypass(request: Request, controls: EmergencyControls): boolean {
  if (!controls.allowFounderBypass) return false;
  return Boolean(
    request.headers.get("x-pc365") &&
    request.headers.get("x-founder") &&
    request.headers.get("x-device")
  );
}

export async function evaluateEmergencyProtocolBlock(
  request: Request,
  payload: Record<string, unknown>
): Promise<EmergencyBlockResult> {
  const snapshot = await fetchEnforcementSnapshot();
  if (!snapshot.active) {
    return { blocked: false, snapshot };
  }

  if (hasFounderBypass(request, snapshot.controls)) {
    return { blocked: false, snapshot };
  }

  const signal = payloadSignal(payload);
  const clientCountry = getRequestCountry(request);
  const clientIp = getRequestIp(request);
  const isReadOnly = READ_ONLY_PATTERN.test(signal);

  if (clientCountry && snapshot.controls.blockedRegions.includes(clientCountry)) {
    return {
      blocked: true,
      control: "blocked-regions",
      message: `Emergency protocol blocked request from region ${clientCountry}.`,
      snapshot
    };
  }

  if (isBlockedIp(clientIp, snapshot.controls.blockedIpRanges)) {
    return {
      blocked: true,
      control: "blocked-ip-ranges",
      message: "Emergency protocol blocked request from this IP range.",
      snapshot
    };
  }

  if (snapshot.controls.freezeTransactions && TRANSACTION_PATTERN.test(signal)) {
    return {
      blocked: true,
      control: "freeze-transactions",
      message: "Global transaction freeze is active.",
      snapshot
    };
  }

  if (snapshot.controls.freezeWalletPayouts && PAYOUT_PATTERN.test(signal)) {
    return {
      blocked: true,
      control: "freeze-wallet-payouts",
      message: "Global wallet payout freeze is active.",
      snapshot
    };
  }

  if (snapshot.controls.disableMajorFeatures && !isReadOnly) {
    return {
      blocked: true,
      control: "disable-major-features",
      message: "Major feature execution is disabled during emergency protocol.",
      snapshot
    };
  }

  if (
    snapshot.controls.disabledFeatures.length > 0 &&
    snapshot.controls.disabledFeatures.some(
      (feature) => feature === "*" || signal.includes(feature)
    )
  ) {
    return {
      blocked: true,
      control: "disabled-features",
      message: "This feature is disabled during emergency protocol.",
      snapshot
    };
  }

  return { blocked: false, snapshot };
}
