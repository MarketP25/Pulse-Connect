import { randomUUID } from "crypto";
import { DashboardInteractionEvent, DashboardRecommendation, DashboardUser } from "@/types/dashboard";

const CSI_REASON_CODE = "CSI_GATEWAY_ACCESS";

function getGatewayEndpoint(): string {
  return (
    process.env.PULSCO_CSI_GATEWAY_URL ||
    process.env.PULSCO_EDGE_GATEWAY_URL ||
    process.env.PULSCO_MARP_FIREWALL_URL ||
    ""
  );
}

function defaultRecommendations(user: DashboardUser): DashboardRecommendation[] {
  return [
    {
      id: randomUUID(),
      source: "csi",
      title: "Optimize module usage",
      detail: `CSI suggests prioritizing ${user.tier} workflows with the highest engagement score this week.`,
      priority: "medium",
      requiresApproval: false,
      approvalRole: "none",
      status: "suggested",
    },
    {
      id: randomUUID(),
      source: "csi",
      title: "Security hardening advisory",
      detail: "Enable periodic consent reviews and keep PC365 key rotation active.",
      priority: "high",
      requiresApproval: true,
      approvalRole: "superadmin",
      status: "suggested",
    },
  ];
}

export async function fetchCsiRecommendations(user: DashboardUser): Promise<DashboardRecommendation[]> {
  const endpoint = getGatewayEndpoint();

  if (!endpoint) {
    return defaultRecommendations(user);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csi-reason-code": CSI_REASON_CODE,
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui",
      },
      cache: "no-store",
      body: JSON.stringify({
        subsystem: "dashboard",
        action: "advisory.recommendations",
        userId: user.id,
        context: {
          tier: user.tier,
          role: user.role,
          language: user.preferredLanguage,
          complianceProfile: user.complianceProfile,
        },
      }),
    });

    if (!response.ok) {
      return defaultRecommendations(user);
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const rawRecommendations = Array.isArray(payload.recommendations)
      ? payload.recommendations
      : Array.isArray(payload.data)
      ? payload.data
      : [];

    const normalized = rawRecommendations
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }

        const model = entry as Record<string, unknown>;
        return {
          id: String(model.id || randomUUID()),
          source: "csi" as const,
          title: String(model.title || "CSI advisory"),
          detail: String(model.detail || model.description || "No detail provided."),
          priority: (model.priority === "high" || model.priority === "low" ? model.priority : "medium") as
            | "low"
            | "medium"
            | "high",
          requiresApproval: Boolean(model.requiresApproval),
          approvalRole: (model.approvalRole === "founder" || model.approvalRole === "superadmin"
            ? model.approvalRole
            : "none") as "none" | "superadmin" | "founder",
          status: "suggested" as const,
        };
      })
      .filter(Boolean) as DashboardRecommendation[];

    return normalized.length ? normalized : defaultRecommendations(user);
  } catch {
    return defaultRecommendations(user);
  }
}

export async function forwardDashboardInteraction(event: DashboardInteractionEvent): Promise<void> {
  const endpoint = getGatewayEndpoint();
  if (!endpoint) {
    return;
  }

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csi-reason-code": CSI_REASON_CODE,
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui",
      },
      cache: "no-store",
      body: JSON.stringify({
        subsystem: "dashboard",
        action: "telemetry.interaction",
        userId: event.userId,
        context: {
          eventType: event.eventType,
          module: event.module,
          metadata: event.metadata || {},
          timestamp: event.timestamp,
        },
      }),
    });
  } catch {
    // Intentionally non-blocking. Dashboard writes should not fail on telemetry forwarding.
  }
}
