import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminRoleType } from "@pulsco/admin-shared-types";

export type EmergencySeverity = "elevated" | "critical" | "lockdown";
export type EmergencyReasonCategory =
  | "security-breach"
  | "economic-attack"
  | "regulatory-demand"
  | "operational-failure"
  | "other";
export type EmergencyMutationAction = "activate" | "update" | "deactivate";

export interface EmergencyControls {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
}

export interface EmergencyCSILinkage {
  correlationId: string;
  linkedAt: string;
  riskScore: number;
  anomaliesObserved: number;
  confidence: number;
  signals: string[];
  source: "admin-gateway-csi-proxy";
}

export interface EmergencyAuditEntry {
  id: string;
  action: EmergencyMutationAction;
  reason: string;
  reasonCategory: EmergencyReasonCategory;
  at: string;
  actorRole: AdminRoleType;
  actorId: string;
  founderApproved: boolean;
  source: string;
}

export interface EmergencyProtocolState {
  active: boolean;
  protocolId: string;
  severity: EmergencySeverity;
  reason: string;
  reasonCategory: EmergencyReasonCategory;
  controls: EmergencyControls;
  csiLinkage?: EmergencyCSILinkage;
  activatedAt?: string;
  deactivatedAt?: string;
  lastUpdatedAt: string;
  lastUpdatedByRole: AdminRoleType;
  lastUpdatedBy: string;
  source: string;
  version: number;
  history: EmergencyAuditEntry[];
}

export interface EmergencyMutationRequest {
  action: EmergencyMutationAction;
  reason: string;
  reasonCategory?: EmergencyReasonCategory;
  severity?: EmergencySeverity;
  controls?: Partial<EmergencyControls>;
  csiLinkage?: EmergencyCSILinkage;
  founderApproved: boolean;
  triggeredByRole: AdminRoleType;
  triggeredBy: string;
  source?: string;
}

export interface EmergencyEnforcementSnapshot {
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
}

const DEFAULT_CONTROLS: EmergencyControls = {
  disableMajorFeatures: false,
  disabledFeatures: [],
  freezeTransactions: false,
  freezeWalletPayouts: false,
  blockedRegions: [],
  blockedIpRanges: [],
  allowFounderBypass: true
};

const DEFAULT_STATE: EmergencyProtocolState = {
  active: false,
  protocolId: "",
  severity: "elevated",
  reason: "",
  reasonCategory: "other",
  controls: DEFAULT_CONTROLS,
  lastUpdatedAt: new Date(0).toISOString(),
  lastUpdatedByRole: "superadmin",
  lastUpdatedBy: "system",
  source: "admin-gateway",
  version: 1,
  history: []
};

let cachedState: EmergencyProtocolState | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 1500;

function stateFilePath(): string {
  if (process.env.ADMIN_GATEWAY_EMERGENCY_STATE_FILE) {
    return process.env.ADMIN_GATEWAY_EMERGENCY_STATE_FILE;
  }

  return path.join(process.cwd(), ".pulsco", "admin-gateway", "emergency-protocol-state.json");
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeFeatureList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return unique(
    input
      .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
      .filter(Boolean)
  );
}

function normalizeRegionList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return unique(
    input
      .map((value) => (typeof value === "string" ? value.trim().toUpperCase() : ""))
      .filter((value) => value.length >= 2 && value.length <= 3)
  );
}

function normalizeIpList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return unique(
    input.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
  );
}

function sanitizeControls(input?: Partial<EmergencyControls>): EmergencyControls {
  return {
    disableMajorFeatures: Boolean(input?.disableMajorFeatures),
    disabledFeatures: normalizeFeatureList(input?.disabledFeatures),
    freezeTransactions: Boolean(input?.freezeTransactions),
    freezeWalletPayouts: Boolean(input?.freezeWalletPayouts),
    blockedRegions: normalizeRegionList(input?.blockedRegions),
    blockedIpRanges: normalizeIpList(input?.blockedIpRanges),
    allowFounderBypass: input?.allowFounderBypass ?? true
  };
}

function normalizeReasonCategory(input: unknown): EmergencyReasonCategory {
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

function normalizeSeverity(input: unknown): EmergencySeverity {
  if (input === "elevated" || input === "critical" || input === "lockdown") return input;
  return "critical";
}

function normalizeState(input: unknown): EmergencyProtocolState {
  const value =
    typeof input === "object" && input !== null ? (input as Partial<EmergencyProtocolState>) : {};
  const controls = sanitizeControls(value.controls);

  return {
    active: Boolean(value.active),
    protocolId: typeof value.protocolId === "string" ? value.protocolId : "",
    severity: normalizeSeverity(value.severity),
    reason: typeof value.reason === "string" ? value.reason : "",
    reasonCategory: normalizeReasonCategory(value.reasonCategory),
    controls,
    csiLinkage: value.csiLinkage,
    activatedAt: value.activatedAt,
    deactivatedAt: value.deactivatedAt,
    lastUpdatedAt:
      typeof value.lastUpdatedAt === "string" ? value.lastUpdatedAt : new Date().toISOString(),
    lastUpdatedByRole: value.lastUpdatedByRole || "superadmin",
    lastUpdatedBy: typeof value.lastUpdatedBy === "string" ? value.lastUpdatedBy : "system",
    source: typeof value.source === "string" ? value.source : "admin-gateway",
    version: typeof value.version === "number" && value.version > 0 ? value.version : 1,
    history: Array.isArray(value.history) ? value.history : []
  };
}

async function readStateFromDisk(): Promise<EmergencyProtocolState> {
  try {
    const raw = await fs.readFile(stateFilePath(), "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    return normalizeState(DEFAULT_STATE);
  }
}

async function writeStateToDisk(state: EmergencyProtocolState): Promise<void> {
  const target = stateFilePath();
  await fs.mkdir(path.dirname(target), { recursive: true });

  const tempPath = `${target}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf8");
  await fs.rename(tempPath, target);
}

function nextProtocolId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `ep-${Date.now()}-${random}`;
}

function nextAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getEmergencyProtocolState(
  forceReload = false
): Promise<EmergencyProtocolState> {
  const now = Date.now();
  if (!forceReload && cachedState && now - cachedAt < CACHE_TTL_MS) {
    return cachedState;
  }

  const state = await readStateFromDisk();
  cachedState = state;
  cachedAt = now;
  return state;
}

export async function mutateEmergencyProtocolState(
  request: EmergencyMutationRequest
): Promise<EmergencyProtocolState> {
  const nowIso = new Date().toISOString();
  const current = await getEmergencyProtocolState(true);
  const reason = request.reason.trim();
  const reasonCategory = normalizeReasonCategory(request.reasonCategory);
  const source = request.source || "admin-gateway";

  let nextState = current;
  if (request.action === "activate") {
    const baseControls = request.controls ? sanitizeControls(request.controls) : current.controls;
    nextState = {
      ...current,
      active: true,
      protocolId: current.active && current.protocolId ? current.protocolId : nextProtocolId(),
      severity: normalizeSeverity(request.severity || current.severity),
      reason,
      reasonCategory,
      controls: baseControls,
      activatedAt: current.active ? current.activatedAt || nowIso : nowIso,
      deactivatedAt: undefined,
      csiLinkage: request.csiLinkage || current.csiLinkage,
      lastUpdatedAt: nowIso,
      lastUpdatedByRole: request.triggeredByRole,
      lastUpdatedBy: request.triggeredBy,
      source,
      version: current.version + 1
    };
  } else if (request.action === "update") {
    if (!current.active) {
      throw new Error("Cannot update emergency protocol while inactive. Activate it first.");
    }

    const mergedControls = sanitizeControls({
      ...current.controls,
      ...(request.controls || {})
    });

    nextState = {
      ...current,
      severity: normalizeSeverity(request.severity || current.severity),
      reason: reason || current.reason,
      reasonCategory,
      controls: mergedControls,
      csiLinkage: request.csiLinkage || current.csiLinkage,
      lastUpdatedAt: nowIso,
      lastUpdatedByRole: request.triggeredByRole,
      lastUpdatedBy: request.triggeredBy,
      source,
      version: current.version + 1
    };
  } else if (request.action === "deactivate") {
    nextState = {
      ...current,
      active: false,
      reason: reason || current.reason,
      reasonCategory,
      deactivatedAt: nowIso,
      lastUpdatedAt: nowIso,
      lastUpdatedByRole: request.triggeredByRole,
      lastUpdatedBy: request.triggeredBy,
      source,
      version: current.version + 1
    };
  }

  const auditEntry: EmergencyAuditEntry = {
    id: nextAuditId(),
    action: request.action,
    reason: reason || current.reason || "Emergency protocol updated",
    reasonCategory,
    at: nowIso,
    actorRole: request.triggeredByRole,
    actorId: request.triggeredBy,
    founderApproved: request.founderApproved,
    source
  };

  nextState = {
    ...nextState,
    history: [...current.history.slice(-49), auditEntry]
  };

  await writeStateToDisk(nextState);
  cachedState = nextState;
  cachedAt = Date.now();
  return nextState;
}

export function toEmergencyEnforcementSnapshot(
  state: EmergencyProtocolState
): EmergencyEnforcementSnapshot {
  return {
    active: state.active,
    protocolId: state.protocolId,
    severity: state.severity,
    controls: state.controls,
    activatedAt: state.activatedAt,
    lastUpdatedAt: state.lastUpdatedAt,
    riskScore: state.csiLinkage?.riskScore,
    anomaliesObserved: state.csiLinkage?.anomaliesObserved,
    correlationId: state.csiLinkage?.correlationId,
    source: state.source,
    version: state.version
  };
}
