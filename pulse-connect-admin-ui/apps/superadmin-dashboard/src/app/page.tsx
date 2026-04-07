"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Badge,
  Alert,
  LoadingSpinner,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@pulsco/admin-ui-core";

interface SystemMetrics {
  totalAdmins: number;
  activeSessions: number;
  systemHealth: number;
  marpSignatures: number;
  csiAnomalies: number;
  governanceAlerts: number;
  crossDomainCorrelations: number;
}

interface DashboardSnapshot {
  role: string;
  status: "healthy" | "warning" | "critical";
  alerts: number;
}

type EmergencySeverity = "elevated" | "critical" | "lockdown";
type EmergencyReasonCategory =
  | "security-breach"
  | "economic-attack"
  | "regulatory-demand"
  | "operational-failure"
  | "other";

interface EmergencyControls {
  disableMajorFeatures: boolean;
  disabledFeatures: string[];
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string[];
  blockedIpRanges: string[];
  allowFounderBypass: boolean;
}

interface EmergencyProtocolState {
  active: boolean;
  protocolId: string;
  severity: EmergencySeverity;
  reason: string;
  reasonCategory: EmergencyReasonCategory;
  controls: EmergencyControls;
  csiLinkage?: {
    riskScore?: number;
    anomaliesObserved?: number;
    correlationId?: string;
    signals?: string[];
  };
  activatedAt?: string;
  lastUpdatedAt?: string;
}

interface EmergencyFormState {
  reason: string;
  reasonCategory: EmergencyReasonCategory;
  severity: EmergencySeverity;
  disableMajorFeatures: boolean;
  disabledFeatures: string;
  freezeTransactions: boolean;
  freezeWalletPayouts: boolean;
  blockedRegions: string;
  blockedIpRanges: string;
  allowFounderBypass: boolean;
}

const FALLBACK_METRICS: SystemMetrics = {
  totalAdmins: 10,
  activeSessions: 8,
  systemHealth: 98.5,
  marpSignatures: 1247,
  csiAnomalies: 3,
  governanceAlerts: 2,
  crossDomainCorrelations: 15
};

const FALLBACK_SNAPSHOTS: DashboardSnapshot[] = [
  { role: "Tech Security", status: "critical", alerts: 3 },
  { role: "People & Risk", status: "warning", alerts: 2 },
  { role: "COO", status: "healthy", alerts: 0 }
];

const FALLBACK_ALERTS = [
  {
    id: "1",
    type: "critical",
    title: "Tech Security threat cluster",
    description: "Multiple high-risk anomalies detected."
  }
];

const DEFAULT_EMERGENCY_STATE: EmergencyProtocolState = {
  active: false,
  protocolId: "",
  severity: "elevated",
  reason: "",
  reasonCategory: "other",
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

const DEFAULT_EMERGENCY_FORM: EmergencyFormState = {
  reason: "",
  reasonCategory: "security-breach",
  severity: "critical",
  disableMajorFeatures: false,
  disabledFeatures: "billing,wallet,payments",
  freezeTransactions: true,
  freezeWalletPayouts: true,
  blockedRegions: "",
  blockedIpRanges: "",
  allowFounderBypass: true
};

function csvToList(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function listToCsv(items?: string[]) {
  return Array.isArray(items) ? items.join(", ") : "";
}

function emergencyToForm(state: EmergencyProtocolState): EmergencyFormState {
  return {
    reason: state.reason || "",
    reasonCategory: state.reasonCategory || "other",
    severity: state.severity || "critical",
    disableMajorFeatures: Boolean(state.controls?.disableMajorFeatures),
    disabledFeatures: listToCsv(state.controls?.disabledFeatures),
    freezeTransactions: Boolean(state.controls?.freezeTransactions),
    freezeWalletPayouts: Boolean(state.controls?.freezeWalletPayouts),
    blockedRegions: listToCsv(state.controls?.blockedRegions),
    blockedIpRanges: listToCsv(state.controls?.blockedIpRanges),
    allowFounderBypass: state.controls?.allowFounderBypass !== false
  };
}

type IconProps = { className?: string };

function ShieldIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3l7 3v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6l7-3z" />
    </svg>
  );
}

function LockIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2L2 20h20L12 2z" />
      <path d="M12 9v5" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  );
}

function CheckCircleIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  );
}

function ActivityIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <polyline points="3 12 7 12 10 6 14 18 17 12 21 12" />
    </svg>
  );
}

function ZapIcon({ className = "" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className={className}
      aria-hidden="true"
    >
      <polygon points="13 2 4 14 11 14 9 22 20 9 13 9 13 2" />
    </svg>
  );
}

export default function SuperAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<DashboardSnapshot[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const [emergencyState, setEmergencyState] =
    useState<EmergencyProtocolState>(DEFAULT_EMERGENCY_STATE);
  const [emergencyForm, setEmergencyForm] = useState<EmergencyFormState>(DEFAULT_EMERGENCY_FORM);
  const [founderApproved, setFounderApproved] = useState(false);
  const [emergencyBusy, setEmergencyBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const refreshEmergencyState = async () => {
    try {
      const response = await fetch("api/admin/emergency-protocol", {
        method: "GET",
        headers: { "x-admin-role": "superadmin" },
        cache: "no-store"
      });

      if (!response.ok) throw new Error(`Emergency state request failed with ${response.status}`);
      const payload = (await response.json()) as EmergencyProtocolState;
      const merged = {
        ...DEFAULT_EMERGENCY_STATE,
        ...payload,
        controls: { ...DEFAULT_EMERGENCY_STATE.controls, ...(payload.controls || {}) }
      };
      setEmergencyState(merged);
      if (merged.active) setEmergencyForm(emergencyToForm(merged));
    } catch (error) {
      console.error("Emergency state load failed", error);
      setEmergencyState(DEFAULT_EMERGENCY_STATE);
    }
  };

  const mutateEmergencyState = async (action: "activate" | "update" | "deactivate") => {
    if (!founderApproved) {
      setFeedback({ type: "error", message: "Founder approval is required." });
      return;
    }
    if (!emergencyForm.reason.trim()) {
      setFeedback({ type: "error", message: "Incident reason is required." });
      return;
    }

    setEmergencyBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("api/admin/emergency-protocol", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": "superadmin"
        },
        body: JSON.stringify({
          action,
          reason: emergencyForm.reason.trim(),
          reasonCategory: emergencyForm.reasonCategory,
          severity: emergencyForm.severity,
          founderApproved: true,
          controls: {
            disableMajorFeatures: emergencyForm.disableMajorFeatures,
            disabledFeatures: csvToList(emergencyForm.disabledFeatures).map((item) =>
              item.toLowerCase()
            ),
            freezeTransactions: emergencyForm.freezeTransactions,
            freezeWalletPayouts: emergencyForm.freezeWalletPayouts,
            blockedRegions: csvToList(emergencyForm.blockedRegions).map((item) =>
              item.toUpperCase()
            ),
            blockedIpRanges: csvToList(emergencyForm.blockedIpRanges),
            allowFounderBypass: emergencyForm.allowFounderBypass
          }
        }),
        cache: "no-store"
      });

      const text = await response.text();
      const payload = text
        ? (JSON.parse(text) as { state?: EmergencyProtocolState; message?: string })
        : {};
      if (!response.ok)
        throw new Error(
          payload.message || text || `Emergency protocol mutation failed with ${response.status}`
        );

      if (payload.state) {
        const merged = {
          ...DEFAULT_EMERGENCY_STATE,
          ...payload.state,
          controls: { ...DEFAULT_EMERGENCY_STATE.controls, ...(payload.state.controls || {}) }
        };
        setEmergencyState(merged);
        setEmergencyForm(emergencyToForm(merged));
      }

      setFeedback({ type: "success", message: payload.message || "Emergency protocol updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Emergency protocol mutation failed."
      });
    } finally {
      setEmergencyBusy(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const headers = { "x-admin-role": "superadmin" };
        const [metricsRes, anomaliesRes] = await Promise.all([
          fetch("api/admin/intelligence?action=metrics", { headers, cache: "no-store" }),
          fetch("api/admin/intelligence?action=anomalies", { headers, cache: "no-store" })
        ]);

        if (!metricsRes.ok) throw new Error(`Metrics request failed with ${metricsRes.status}`);
        const metricsPayload = await metricsRes.json();
        const rawMetrics = metricsPayload.metrics || metricsPayload.data || metricsPayload || {};
        const anomalyPayload = anomaliesRes.ok ? await anomaliesRes.json() : {};
        const anomalyList = anomalyPayload.anomalies || anomalyPayload.data?.anomalies || [];

        setMetrics({
          totalAdmins: Number(
            rawMetrics.totalAdmins || rawMetrics.total_admins || FALLBACK_METRICS.totalAdmins
          ),
          activeSessions: Number(
            rawMetrics.activeSessions ||
              rawMetrics.active_sessions ||
              FALLBACK_METRICS.activeSessions
          ),
          systemHealth: Number(
            rawMetrics.systemHealth || rawMetrics.system_health || FALLBACK_METRICS.systemHealth
          ),
          marpSignatures: Number(
            rawMetrics.marpSignatures ||
              rawMetrics.marp_signatures ||
              FALLBACK_METRICS.marpSignatures
          ),
          csiAnomalies: Array.isArray(anomalyList)
            ? anomalyList.length
            : FALLBACK_METRICS.csiAnomalies,
          governanceAlerts: Number(
            rawMetrics.governanceAlerts ||
              rawMetrics.governance_alerts ||
              FALLBACK_METRICS.governanceAlerts
          ),
          crossDomainCorrelations: Number(
            rawMetrics.crossDomainCorrelations ||
              rawMetrics.cross_domain_correlations ||
              FALLBACK_METRICS.crossDomainCorrelations
          )
        });

        setSnapshots(FALLBACK_SNAPSHOTS);
        setAlerts(
          Array.isArray(anomalyList) && anomalyList.length
            ? anomalyList.slice(0, 2)
            : FALLBACK_ALERTS
        );
      } catch (error) {
        console.error("Failed to load superadmin data", error);
        setMetrics(FALLBACK_METRICS);
        setSnapshots(FALLBACK_SNAPSHOTS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    void Promise.all([load(), refreshEmergencyState()]);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Global Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <ShieldIcon className="mr-3 h-8 w-8 text-blue-600" />
              SuperAdmin Global Command Center
            </h1>
            <p className="text-gray-600">
              Founder-gated global emergency controls are active from this panel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={emergencyState.active ? "error" : "success"}>
              {emergencyState.active ? "Emergency Active" : "Emergency Inactive"}
            </Badge>
            <Button variant="danger" size="sm" onClick={() => setActiveTab("emergency")}>
              <LockIcon className="mr-2 h-4 w-4" />
              Emergency Protocol
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alerts.length > 0 && (
          <div className="mb-6">
            {alerts.map((alert) => (
              <Alert
                key={alert.id || alert.title}
                type={alert.type === "critical" ? "error" : "warning"}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <h4 className="font-medium">{alert.title || "System Alert"}</h4>
                    <p className="text-sm">
                      {alert.description || "A high-priority signal was detected."}
                    </p>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Health</p>
                <p className="text-2xl font-bold">{metrics?.systemHealth}%</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold">{metrics?.activeSessions}/10</p>
              </div>
              <ActivityIcon className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MARP Signatures</p>
                <p className="text-2xl font-bold">{metrics?.marpSignatures}</p>
              </div>
              <ShieldIcon className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Correlations</p>
                <p className="text-2xl font-bold">{metrics?.crossDomainCorrelations}</p>
              </div>
              <ZapIcon className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="intelligence">CSI Intelligence</TabsTrigger>
            <TabsTrigger value="emergency">Emergency Protocol</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card title="Dashboard Status">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {snapshots.map((snapshot) => (
                  <div key={snapshot.role} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{snapshot.role}</h4>
                      <Badge
                        variant={
                          snapshot.status === "healthy"
                            ? "success"
                            : snapshot.status === "warning"
                              ? "warning"
                              : "error"
                        }
                      >
                        {snapshot.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Alerts: {snapshot.alerts}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="intelligence">
            <Card title="CSI Intelligence">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{metrics?.csiAnomalies}</div>
                  <div className="text-sm text-gray-600">Active Anomalies</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {emergencyState.csiLinkage?.riskScore ?? "n/a"}
                  </div>
                  <div className="text-sm text-gray-600">Emergency Risk Score</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {emergencyState.csiLinkage?.correlationId ? "Linked" : "Not Linked"}
                  </div>
                  <div className="text-sm text-gray-600">Emergency/CSI Linkage</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="emergency" className="space-y-4">
            {feedback && <Alert type={feedback.type}>{feedback.message}</Alert>}
            <Card title="Emergency Control Plane">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Status:</strong> {emergencyState.active ? "ACTIVE" : "INACTIVE"}
                  </p>
                  <p>
                    <strong>Protocol ID:</strong> {emergencyState.protocolId || "n/a"}
                  </p>
                  <p>
                    <strong>Severity:</strong> {emergencyState.severity}
                  </p>
                  <p>
                    <strong>Reason:</strong> {emergencyState.reason || "n/a"}
                  </p>
                  <p>
                    <strong>Category:</strong> {emergencyState.reasonCategory || "n/a"}
                  </p>
                  <p>
                    <strong>Activated:</strong>{" "}
                    {emergencyState.activatedAt
                      ? new Date(emergencyState.activatedAt).toLocaleString()
                      : "n/a"}
                  </p>
                  <p>
                    <strong>Last Updated:</strong>{" "}
                    {emergencyState.lastUpdatedAt
                      ? new Date(emergencyState.lastUpdatedAt).toLocaleString()
                      : "n/a"}
                  </p>
                  <p>
                    <strong>CSI Correlation:</strong>{" "}
                    {emergencyState.csiLinkage?.correlationId || "n/a"}
                  </p>
                </div>

                <div className="space-y-3">
                  <textarea
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    value={emergencyForm.reason}
                    onChange={(event) =>
                      setEmergencyForm((prev) => ({ ...prev, reason: event.target.value }))
                    }
                    placeholder="Incident reason and objective"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="border rounded-md p-2 text-sm"
                      value={emergencyForm.reasonCategory}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          reasonCategory: event.target.value as EmergencyReasonCategory
                        }))
                      }
                    >
                      <option value="security-breach">Security Breach</option>
                      <option value="economic-attack">Economic Attack</option>
                      <option value="regulatory-demand">Regulatory Demand</option>
                      <option value="operational-failure">Operational Failure</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      className="border rounded-md p-2 text-sm"
                      value={emergencyForm.severity}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          severity: event.target.value as EmergencySeverity
                        }))
                      }
                    >
                      <option value="elevated">Elevated</option>
                      <option value="critical">Critical</option>
                      <option value="lockdown">Lockdown</option>
                    </select>
                  </div>
                  <input
                    className="w-full border rounded-md p-2 text-sm"
                    value={emergencyForm.disabledFeatures}
                    onChange={(event) =>
                      setEmergencyForm((prev) => ({
                        ...prev,
                        disabledFeatures: event.target.value
                      }))
                    }
                    placeholder="Disabled feature tags (csv)"
                  />
                  <input
                    className="w-full border rounded-md p-2 text-sm"
                    value={emergencyForm.blockedRegions}
                    onChange={(event) =>
                      setEmergencyForm((prev) => ({ ...prev, blockedRegions: event.target.value }))
                    }
                    placeholder="Blocked regions (csv ISO)"
                  />
                  <input
                    className="w-full border rounded-md p-2 text-sm"
                    value={emergencyForm.blockedIpRanges}
                    onChange={(event) =>
                      setEmergencyForm((prev) => ({ ...prev, blockedIpRanges: event.target.value }))
                    }
                    placeholder="Blocked IP/CIDR (csv)"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={emergencyForm.disableMajorFeatures}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          disableMajorFeatures: event.target.checked
                        }))
                      }
                    />{" "}
                    Disable major features/services
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={emergencyForm.freezeTransactions}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          freezeTransactions: event.target.checked
                        }))
                      }
                    />{" "}
                    Freeze transactions
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={emergencyForm.freezeWalletPayouts}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          freezeWalletPayouts: event.target.checked
                        }))
                      }
                    />{" "}
                    Freeze wallet payouts
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={emergencyForm.allowFounderBypass}
                      onChange={(event) =>
                        setEmergencyForm((prev) => ({
                          ...prev,
                          allowFounderBypass: event.target.checked
                        }))
                      }
                    />{" "}
                    Allow founder bypass
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <input
                      type="checkbox"
                      checked={founderApproved}
                      onChange={(event) => setFounderApproved(event.target.checked)}
                    />{" "}
                    Founder approval attestation confirmed
                  </label>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {!emergencyState.active ? (
                      <Button
                        variant="danger"
                        disabled={emergencyBusy}
                        onClick={() => void mutateEmergencyState("activate")}
                      >
                        Activate Protocol
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          disabled={emergencyBusy}
                          onClick={() => void mutateEmergencyState("update")}
                        >
                          Update Protocol
                        </Button>
                        <Button
                          variant="danger"
                          disabled={emergencyBusy}
                          onClick={() => void mutateEmergencyState("deactivate")}
                        >
                          Deactivate Protocol
                        </Button>
                      </>
                    )}
                    <Button
                      variant="secondary"
                      disabled={emergencyBusy}
                      onClick={() => void refreshEmergencyState()}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
