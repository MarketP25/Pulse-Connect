interface EmergencyControls {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
}

interface EmergencyEnforcementSnapshot {
  active: boolean;
  severity: "elevated" | "critical" | "lockdown";
  controls: EmergencyControls;
  protocolId?: string;
  source?: string;
  lastUpdatedAt?: string;
}

const CACHE_TTL_MS = 15_000;

const DEFAULT_SNAPSHOT: EmergencyEnforcementSnapshot = {
  active: false,
  severity: "elevated",
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

const FAIL_SAFE_SNAPSHOT: EmergencyEnforcementSnapshot = {
  active: true,
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
  source: "dashboard-emergency-failsafe"
};

let cachedSnapshot: EmergencyEnforcementSnapshot | null = null;
let cacheExpiresAt = 0;

function getPolicyUrl(): string {
  if (process.env.PULSCO_EMERGENCY_POLICY_URL) return process.env.PULSCO_EMERGENCY_POLICY_URL;
  const base = process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
  return `${base}/api/admin/emergency-protocol?scope=enforcement`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean);
}

function normalizeSnapshot(value: unknown): EmergencyEnforcementSnapshot {
  const candidate = (typeof value === "object" && value ? value : {}) as Record<string, unknown>;
  const controlsRaw =
    typeof candidate.controls === "object" && candidate.controls
      ? (candidate.controls as Record<string, unknown>)
      : {};

  return {
    active: Boolean(candidate.active),
    severity:
      candidate.severity === "elevated" ||
      candidate.severity === "critical" ||
      candidate.severity === "lockdown"
        ? candidate.severity
        : "critical",
    controls: {
      disableMajorFeatures: Boolean(controlsRaw.disableMajorFeatures),
      disabledFeatures: asStringArray(controlsRaw.disabledFeatures).map((entry) =>
        entry.toLowerCase()
      ),
      freezeTransactions: Boolean(controlsRaw.freezeTransactions),
      freezeWalletPayouts: Boolean(controlsRaw.freezeWalletPayouts),
      blockedRegions: asStringArray(controlsRaw.blockedRegions).map((entry) => entry.toUpperCase()),
      blockedIpRanges: asStringArray(controlsRaw.blockedIpRanges),
      allowFounderBypass: controlsRaw.allowFounderBypass !== false
    },
    protocolId: typeof candidate.protocolId === "string" ? candidate.protocolId : undefined,
    source: typeof candidate.source === "string" ? candidate.source : undefined,
    lastUpdatedAt: typeof candidate.lastUpdatedAt === "string" ? candidate.lastUpdatedAt : undefined
  };
}

async function fetchEmergencySnapshot(): Promise<EmergencyEnforcementSnapshot> {
  const now = Date.now();
  if (cachedSnapshot && now < cacheExpiresAt) {
    return cachedSnapshot;
  }

  try {
    const headers: Record<string, string> = {};
    const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (internalToken) {
      headers["x-internal-service-token"] = internalToken;
      headers.authorization = `Bearer ${internalToken}`;
    }

    const response = await fetch(getPolicyUrl(), {
      method: "GET",
      headers,
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Emergency snapshot request failed: ${response.status}`);
    }

    const payload = await response.json();
    const normalized = normalizeSnapshot(payload);
    cachedSnapshot = normalized;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return normalized;
  } catch (error) {
    console.warn("Failed to fetch emergency protocol snapshot for dashboard operations", error);
    if (cachedSnapshot) {
      // Keep previous snapshot instead of failing open on transient network errors.
      return cachedSnapshot;
    }

    if (process.env.NODE_ENV === "production") {
      cachedSnapshot = FAIL_SAFE_SNAPSHOT;
      cacheExpiresAt = now + CACHE_TTL_MS;
      return FAIL_SAFE_SNAPSHOT;
    }

    return DEFAULT_SNAPSHOT;
  }
}

function isRegionBlocked(region: string | undefined, blockedRegions: string[]): boolean {
  if (!region) return false;
  return blockedRegions.includes(region.toUpperCase());
}

function isFeatureDisabled(feature: string, controls: EmergencyControls): boolean {
  const disabled = new Set(controls.disabledFeatures);
  return controls.disableMajorFeatures || disabled.has(feature) || disabled.has(`${feature}:*`);
}

export class EmergencyProtocolBlockedError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function assertEmergencyActionAllowed(params: {
  feature: "billing" | "places";
  action: string;
  region?: string;
}): Promise<void> {
  const snapshot = await fetchEmergencySnapshot();
  if (!snapshot.active) {
    return;
  }

  const controls = snapshot.controls;

  if (isRegionBlocked(params.region, controls.blockedRegions)) {
    throw new EmergencyProtocolBlockedError(
      `Emergency protocol blocks operations in region ${params.region}. Current protocol: ${snapshot.protocolId || "active"}.`
    );
  }

  if (isFeatureDisabled(params.feature, controls)) {
    throw new EmergencyProtocolBlockedError(
      `Emergency protocol disabled ${params.feature} operations. Current protocol: ${snapshot.protocolId || "active"}.`
    );
  }

  if (controls.freezeTransactions) {
    if (params.feature === "billing") {
      throw new EmergencyProtocolBlockedError("Emergency protocol froze billing transactions.");
    }

    if (params.feature === "places" && params.action === "create_booking") {
      throw new EmergencyProtocolBlockedError(
        "Emergency protocol froze transaction-backed place bookings."
      );
    }
  }

  if (controls.freezeWalletPayouts && params.feature === "billing" && params.action === "payout") {
    throw new EmergencyProtocolBlockedError("Emergency protocol froze wallet payouts.");
  }
}
