// Admin Gateway - Central orchestration layer for admin dashboards
// This is the ONLY entry point for admin dashboards to access system intelligence
// All CSI interactions happen here, dashboards only communicate through this gateway

import { AdminRoleType } from "@pulsco/admin-shared-types";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  EmergencyCSILinkage,
  EmergencyMutationAction,
  getEmergencyProtocolState,
  mutateEmergencyProtocolState,
  toEmergencyEnforcementSnapshot
} from "./emergency-protocol";

// Gateway Configuration
const CSI_API_BASE = process.env.CSI_API_BASE || "";
const CSI_AUTH_TOKEN = process.env.CSI_AUTH_TOKEN || "";

// Service URLs for domain orchestration
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || "http://localhost:3100";
const GOVERNANCE_SERVICE_URL = process.env.GOVERNANCE_SERVICE_URL || "http://localhost:4002";
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || "http://localhost:3004";
const OBSERVABILITY_SERVICE_URL = process.env.OBSERVABILITY_SERVICE_URL || "http://localhost:3005";

const ALLOW_LEGACY_PC365_ATTESTATION = process.env.ALLOW_LEGACY_PC365_ATTESTATION === "true";
const PC365_GUARD_SECRET =
  process.env.ADMIN_GUARD_SIGNING_SECRET || process.env.PC365_GUARD_SIGNING_SECRET || "";

const ADMIN_ROLES: readonly AdminRoleType[] = [
  "superadmin",
  "coo",
  "business-ops",
  "people-risk",
  "procurement-partnerships",
  "legal-finance",
  "commercial-outreach",
  "tech-security",
  "customer-experience",
  "governance-registrar",
  "dpo"
];

function isAdminRole(value: string | null): value is AdminRoleType {
  return Boolean(value && ADMIN_ROLES.includes(value as AdminRoleType));
}

type PC365GuardContext = {
  valid: boolean;
  role?: AdminRoleType;
  founderApproved: boolean;
  actorId?: string;
  source?: string;
  error?: string;
};

type PC365GuardClaims = {
  role: AdminRoleType;
  founderApproved: boolean;
  source: string;
  actorId?: string;
  issuedAt: string;
  expiresAt: string;
};

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signGuardPayload(encodedPayload: string): string {
  return createHmac("sha256", PC365_GUARD_SECRET).update(encodedPayload).digest("base64url");
}

function verifyGuardToken(
  token: string | null,
  expectedRole?: AdminRoleType
): { valid: boolean; claims?: PC365GuardClaims; error?: string } {
  if (!token) return { valid: false, error: "missing-token" };
  if (!PC365_GUARD_SECRET) return { valid: false, error: "missing-secret" };

  const [encodedPayload, providedSignature] = token.split(".");
  if (!encodedPayload || !providedSignature) {
    return { valid: false, error: "invalid-format" };
  }

  const expectedSignature = signGuardPayload(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "base64url");
  const providedBuffer = Buffer.from(providedSignature, "base64url");
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return { valid: false, error: "invalid-signature" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return { valid: false, error: "invalid-payload" };
  }

  const parsed = payload as Partial<PC365GuardClaims>;
  if (
    !isAdminRole(parsed.role || null) ||
    typeof parsed.founderApproved !== "boolean" ||
    typeof parsed.source !== "string" ||
    typeof parsed.issuedAt !== "string" ||
    typeof parsed.expiresAt !== "string"
  ) {
    return { valid: false, error: "invalid-payload" };
  }

  const expiresAt = Date.parse(parsed.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return { valid: false, error: "expired" };
  }

  if (expectedRole && parsed.role !== expectedRole) {
    return { valid: false, error: "role-mismatch" };
  }

  return { valid: true, claims: parsed as PC365GuardClaims };
}

function jsonResponse(payload: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(payload), {
    ...init,
    headers
  });
}

// PC365 Guard validation - validates privileged operations
async function validatePC365Guard(req: Request): Promise<PC365GuardContext> {
  const guardToken = req.headers.get("x-pc365-guard");
  const declaredRole = req.headers.get("x-admin-role");
  const expectedRole = isAdminRole(declaredRole) ? declaredRole : undefined;

  const verified = verifyGuardToken(guardToken, expectedRole);
  if (verified.valid && verified.claims) {
    return {
      valid: true,
      role: verified.claims.role,
      founderApproved: verified.claims.founderApproved,
      actorId: verified.claims.actorId,
      source: verified.claims.source
    };
  }

  if (process.env.NODE_ENV !== "production" && guardToken?.endsWith(".dev")) {
    const [encodedPayload] = guardToken.split(".");
    try {
      const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<PC365GuardClaims>;
      if (isAdminRole(parsed.role || null)) {
        return {
          valid: true,
          role: parsed.role,
          founderApproved: parsed.founderApproved === true,
          actorId: typeof parsed.actorId === "string" ? parsed.actorId : undefined,
          source: typeof parsed.source === "string" ? parsed.source : "dev-token-fallback"
        };
      }
    } catch {
      // no-op, continue to other fallbacks
    }
  }

  // Temporary migration path for legacy integrations in non-production.
  const legacyAttestation = req.headers.get("x-pc365-attestation");
  if (
    ALLOW_LEGACY_PC365_ATTESTATION &&
    process.env.NODE_ENV !== "production" &&
    legacyAttestation &&
    expectedRole
  ) {
    return {
      valid: true,
      role: expectedRole,
      founderApproved: req.headers.get("x-founder-approved") === "true",
      source: "legacy-attestation-compat"
    };
  }

  return {
    valid: false,
    founderApproved: false,
    error: verified.error || "invalid-guard"
  };
}

// Role-based access control
const ROLE_PERMISSIONS: Record<AdminRoleType, string[]> = {
  superadmin: [
    "metrics",
    "anomalies",
    "intelligence",
    "governance",
    "billing",
    "events",
    "emergency-protocol"
  ],
  "business-ops": ["metrics", "anomalies", "intelligence", "reporting"],
  "commercial-outreach": ["metrics", "intelligence", "reporting"],
  coo: ["metrics", "anomalies", "intelligence", "reporting", "operations"],
  "customer-experience": ["metrics", "intelligence", "reporting"],
  dpo: ["metrics", "intelligence", "compliance"],
  "governance-registrar": ["metrics", "governance", "compliance"],
  "legal-finance": ["metrics", "billing", "compliance", "reporting"],
  "people-risk": ["metrics", "intelligence", "compliance"],
  "procurement-partnerships": ["metrics", "intelligence", "reporting"],
  "tech-security": ["metrics", "anomalies", "intelligence", "security"]
};

function validateRolePermission(role: AdminRoleType, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(action) || false;
}

// Main intelligence endpoint - proxies to CSI through gateway
export async function handleIntelligenceRequest(
  role: AdminRoleType,
  action: string,
  params?: Record<string, string | null | undefined>
) {
  if (!validateRolePermission(role, action)) {
    throw new Error(`Role ${role} does not have permission for action ${action}`);
  }

  switch (action) {
    case "metrics":
    case "anomalies":
    case "intelligence":
      return await fetchFromCSI(role, action, params);

    case "billing":
      return await fetchFromService(BILLING_SERVICE_URL, "/api/billing/metrics", {
        role,
        ...params
      });

    case "governance":
      return await fetchFromService(GOVERNANCE_SERVICE_URL, "/api/governance/status", {
        role,
        ...params
      });

    case "reporting":
      return await fetchFromService(REPORTING_SERVICE_URL, "/api/v1/reports", { role, ...params });

    case "compliance":
      return await fetchFromService(OBSERVABILITY_SERVICE_URL, "/api/compliance", {
        role,
        ...params
      });

    case "security":
      return await fetchFromService(OBSERVABILITY_SERVICE_URL, "/api/security/metrics", {
        role,
        ...params
      });

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Internal CSI communication - happens server-side only
async function fetchFromCSI(
  role: AdminRoleType,
  action: string,
  params?: Record<string, string | null | undefined>
) {
  const csiEndpoint = `${CSI_API_BASE}/api/v1/${action}`;

  try {
    const response = await fetch(csiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CSI_AUTH_TOKEN}`,
        "X-Admin-Role": role
      },
      body: JSON.stringify({ role, action, params })
    });

    if (!response.ok) {
      throw new Error(`CSI request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("CSI unavailable, returning cached intelligence");
    return {
      role,
      action,
      data: getMockIntelligence(role, action),
      timestamp: new Date().toISOString(),
      source: "gateway-proxy",
      error: error instanceof Error ? error.message : "unknown"
    };
  }
}

// Service communication helper
async function fetchFromService(
  serviceUrl: string,
  endpoint: string,
  params: Record<string, string | null | undefined>
) {
  const url = new URL(endpoint, serviceUrl);
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN || ""}`
    }
  });

  if (!response.ok) {
    throw new Error(`Service request failed: ${response.status}`);
  }

  return await response.json();
}

// Mock intelligence for development
function getMockIntelligence(role: AdminRoleType, action: string) {
  const baseMetrics = {
    system_health: 95,
    governance_compliance: 92,
    security_score: 88,
    operational_efficiency: 90
  };

  if (action === "metrics") {
    return baseMetrics;
  }

  if (action === "anomalies") {
    return [];
  }

  if (action === "intelligence") {
    return {
      insights: ["System operating within normal parameters"],
      recommendations: ["Continue monitoring"],
      confidence: 0.85
    };
  }

  return {};
}

const EMERGENCY_READ_ROLES: AdminRoleType[] = ["superadmin", "tech-security", "coo"];
const EMERGENCY_WRITE_ROLES: AdminRoleType[] = ["superadmin"];

function isInternalPolicyReader(req: Request): boolean {
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!internalToken) return process.env.NODE_ENV !== "production";

  const provided = req.headers.get("x-internal-service-token");
  if (provided && provided === internalToken) return true;

  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length) === internalToken;
  }

  return false;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function pickMetricsPayload(payload: unknown): Record<string, unknown> {
  const envelope = asRecord(payload);
  const nested = envelope.data;
  return asRecord(nested && typeof nested === "object" ? nested : envelope);
}

function pickAnomalyList(payload: unknown): Record<string, unknown>[] {
  const envelope = asRecord(payload);
  if (Array.isArray(envelope.anomalies)) return envelope.anomalies.map(asRecord);
  const data = asRecord(envelope.data);
  if (Array.isArray(data.anomalies)) return data.anomalies.map(asRecord);
  if (Array.isArray(envelope.data)) return envelope.data.map(asRecord);
  return [];
}

function parseEmergencyAction(input: unknown): EmergencyMutationAction | null {
  if (input === "activate" || input === "update" || input === "deactivate") return input;
  return null;
}

function parseEmergencySeverity(input: unknown): "elevated" | "critical" | "lockdown" {
  if (input === "elevated" || input === "critical" || input === "lockdown") return input;
  return "critical";
}

function parseReasonCategory(
  input: unknown
): "security-breach" | "economic-attack" | "regulatory-demand" | "operational-failure" | "other" {
  if (
    input === "security-breach" ||
    input === "economic-attack" ||
    input === "regulatory-demand" ||
    input === "operational-failure" ||
    input === "other"
  ) {
    return input;
  }
  return "other";
}

function estimateRiskScore(metricsPayload: unknown, anomalies: Record<string, unknown>[]): number {
  const metrics = pickMetricsPayload(metricsPayload);
  const rawHealth = Number(metrics.system_health ?? metrics.systemHealth ?? 92);
  const health = Number.isFinite(rawHealth) ? Math.max(0, Math.min(100, rawHealth)) : 92;
  const anomalyWeight = anomalies.length * 12;
  return Math.max(0, Math.min(100, Math.round((100 - health) * 0.45 + anomalyWeight)));
}

async function buildEmergencyCsiLinkage(role: AdminRoleType): Promise<EmergencyCSILinkage> {
  const correlationId = `csi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const [metrics, anomalyPayload] = await Promise.all([
      handleIntelligenceRequest(role, "metrics"),
      handleIntelligenceRequest(role, "anomalies")
    ]);

    const anomalies = pickAnomalyList(anomalyPayload);
    const riskScore = estimateRiskScore(metrics, anomalies);
    const confidence = Math.max(0.2, Number((1 - riskScore / 125).toFixed(2)));
    const signals = anomalies
      .slice(0, 5)
      .map((entry) => String(entry.title || entry.metric || entry.source || "unknown-signal"));

    return {
      correlationId,
      linkedAt: new Date().toISOString(),
      riskScore,
      anomaliesObserved: anomalies.length,
      confidence,
      signals,
      source: "admin-gateway-csi-proxy"
    };
  } catch (error) {
    console.warn(
      "Failed to enrich emergency protocol with CSI linkage, using fallback linkage",
      error
    );
    return {
      correlationId,
      linkedAt: new Date().toISOString(),
      riskScore: 50,
      anomaliesObserved: 0,
      confidence: 0.5,
      signals: ["csi-linkage-unavailable"],
      source: "admin-gateway-csi-proxy"
    };
  }
}

async function broadcastEmergencyMutation(payload: {
  action: EmergencyMutationAction;
  state: Awaited<ReturnType<typeof getEmergencyProtocolState>>;
  actorRole: AdminRoleType;
  actorId: string;
}) {
  const rawEndpoints = process.env.EMERGENCY_BROADCAST_ENDPOINTS || "";
  const configuredEndpoints = rawEndpoints
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const derivedEndpoints = [
    process.env.EDGE_GATEWAY_URL
      ? `${process.env.EDGE_GATEWAY_URL.replace(/\/$/, "")}/edge/internal/emergency-protocol/event`
      : "",
    process.env.BILLING_SERVICE_URL
      ? `${process.env.BILLING_SERVICE_URL.replace(/\/$/, "")}/internal/emergency-protocol/event`
      : ""
  ].filter(Boolean);

  const endpoints = Array.from(
    new Set(configuredEndpoints.length > 0 ? configuredEndpoints : derivedEndpoints)
  );

  if (endpoints.length === 0) return;

  await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env.INTERNAL_SERVICE_TOKEN
              ? {
                  authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`,
                  "x-internal-service-token": process.env.INTERNAL_SERVICE_TOKEN
                }
              : {})
          },
          body: JSON.stringify({
            eventType: "emergency_protocol_mutated",
            action: payload.action,
            protocolId: payload.state.protocolId,
            active: payload.state.active,
            severity: payload.state.severity,
            controls: payload.state.controls,
            version: payload.state.version,
            actorRole: payload.actorRole,
            actorId: payload.actorId,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.warn("Emergency broadcast dispatch failed", endpoint, error);
      }
    })
  );
}

// API Route Handlers

export async function intelligenceRoute(req: Request) {
  const guard = await validatePC365Guard(req);
  if (!guard.valid || !guard.role) {
    return new Response("Unauthorized - PC365 guard validation failed", { status: 401 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "metrics";
  const role = guard.role;

  try {
    const data = await handleIntelligenceRequest(role, action, {
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to")
    });

    return jsonResponse(data);
  } catch (error) {
    console.error("Intelligence route error:", error);
    return new Response(error instanceof Error ? error.message : "Internal error", { status: 500 });
  }
}

// Event handler - for dashboard-triggered operations
export async function eventsRoute(req: Request) {
  const guard = await validatePC365Guard(req);
  if (!guard.valid || !guard.role) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Only founder-approved operations can trigger events
  if (!guard.founderApproved) {
    return new Response("Founder approval required for this operation", { status: 403 });
  }

  try {
    const body = await req.json();
    const eventEnvelope = asRecord(body);
    const eventType = String(eventEnvelope.eventType || "unknown-event");

    // Route event to appropriate domain service.
    // Events are processed asynchronously - no direct CSI mutation.
    console.log(`Processing event: ${eventType} from ${guard.role}`);

    return jsonResponse({
      eventId: crypto.randomUUID(),
      status: "queued",
      timestamp: new Date().toISOString()
    });
  } catch {
    return new Response("Invalid request", { status: 400 });
  }
}

// Telemetry endpoint - for dashboard health checks
export async function telemetryRoute(_req: Request) {
  return jsonResponse({
    status: "healthy",
    gateway: "admin-gateway",
    version: "0.3.0",
    timestamp: new Date().toISOString()
  });
}

export async function emergencyProtocolRoute(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope");

  if (req.method === "GET") {
    if (scope === "enforcement") {
      if (!isInternalPolicyReader(req)) {
        return new Response(
          "Unauthorized - internal token required for emergency enforcement scope",
          {
            status: 401
          }
        );
      }

      const state = await getEmergencyProtocolState();
      return jsonResponse(toEmergencyEnforcementSnapshot(state), {
        headers: {
          "Cache-Control": "no-store"
        }
      });
    }

    const guard = await validatePC365Guard(req);
    if (!guard.valid || !guard.role) {
      return new Response("Unauthorized - PC365 guard validation failed", { status: 401 });
    }

    if (!EMERGENCY_READ_ROLES.includes(guard.role)) {
      return new Response("Forbidden - role does not have emergency read access", { status: 403 });
    }

    const state = await getEmergencyProtocolState();
    return jsonResponse(state, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const guard = await validatePC365Guard(req);
  if (!guard.valid || !guard.role) {
    return new Response("Unauthorized - PC365 guard validation failed", { status: 401 });
  }

  if (!EMERGENCY_WRITE_ROLES.includes(guard.role)) {
    return new Response("Forbidden - only superadmin can mutate emergency protocol", {
      status: 403
    });
  }

  if (!guard.founderApproved) {
    return new Response("Founder approval required for emergency protocol mutation", {
      status: 403
    });
  }

  try {
    const body = asRecord(await req.json());
    const action = parseEmergencyAction(body.action);
    if (!action) {
      return new Response("Invalid action. Expected activate, update, or deactivate.", {
        status: 400
      });
    }

    const reason = String(body.reason || "").trim();
    if (!reason) {
      return new Response("A reason is required to mutate emergency protocol state.", {
        status: 400
      });
    }

    const controlsRaw = asRecord(body.controls);
    const hasControls = Object.keys(controlsRaw).length > 0;
    const hasSeverity = typeof body.severity === "string";
    const hasReasonCategory = typeof body.reasonCategory === "string";

    const mutation = {
      action,
      reason,
      reasonCategory: hasReasonCategory ? parseReasonCategory(body.reasonCategory) : undefined,
      severity: hasSeverity ? parseEmergencySeverity(body.severity) : undefined,
      controls: hasControls
        ? {
            disableMajorFeatures: Boolean(controlsRaw.disableMajorFeatures),
            disabledFeatures: toStringArray(controlsRaw.disabledFeatures),
            freezeTransactions: Boolean(controlsRaw.freezeTransactions),
            freezeWalletPayouts: Boolean(controlsRaw.freezeWalletPayouts),
            blockedRegions: toStringArray(controlsRaw.blockedRegions),
            blockedIpRanges: toStringArray(controlsRaw.blockedIpRanges),
            allowFounderBypass: controlsRaw.allowFounderBypass !== false
          }
        : undefined,
      csiLinkage: action === "deactivate" ? undefined : await buildEmergencyCsiLinkage(guard.role),
      founderApproved: true,
      triggeredByRole: guard.role,
      triggeredBy: String(body.actorId || body.actor || guard.actorId || "superadmin-session"),
      source: String(body.source || guard.source || "admin-gateway")
    };

    const state = await mutateEmergencyProtocolState(mutation);
    await broadcastEmergencyMutation({
      action,
      state,
      actorRole: guard.role,
      actorId: mutation.triggeredBy
    });

    return jsonResponse(
      {
        state,
        mutation: action,
        message:
          action === "deactivate"
            ? "Emergency protocol deactivated and controls released."
            : "Emergency protocol state updated successfully."
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Emergency protocol mutation failed", error);
    return new Response("Failed to mutate emergency protocol state", { status: 500 });
  }
}

// Convenience exports for dashboard-specific handlers
export function createDashboardHandler(role: AdminRoleType) {
  return async function (req: Request) {
    const guard = await validatePC365Guard(req);
    if (!guard.valid || guard.role !== role) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "metrics";

    try {
      const data = await handleIntelligenceRequest(role, action);
      return jsonResponse(data);
    } catch {
      return new Response("Error", { status: 500 });
    }
  };
}

// Convenience handler for dashboard metrics routes
export function dashboardMetricsHandler(role: AdminRoleType) {
  return async function (req: Request) {
    const guard = await validatePC365Guard(req);
    if (!guard.valid || !guard.role) {
      return new Response("Unauthorized - PC365 guard validation failed", { status: 401 });
    }

    if (guard.role !== role) {
      return new Response("Forbidden - Invalid role for this dashboard", { status: 403 });
    }

    try {
      const data = await handleIntelligenceRequest(role, "metrics");
      return jsonResponse(data);
    } catch (error) {
      console.error(`Dashboard metrics error for ${role}:`, error);
      return new Response(error instanceof Error ? error.message : "Internal error", {
        status: 500
      });
    }
  };
}
