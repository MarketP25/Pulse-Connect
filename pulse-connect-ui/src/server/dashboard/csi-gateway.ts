import { randomUUID } from "crypto";
import {
  DashboardInteractionEvent,
  DashboardRecommendation,
  DashboardUser
} from "@/types/dashboard";

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
      status: "suggested"
    },
    {
      id: randomUUID(),
      source: "csi",
      title: "Security hardening advisory",
      detail: "Enable periodic consent reviews and keep PC365 key rotation active.",
      priority: "high",
      requiresApproval: true,
      approvalRole: "superadmin",
      status: "suggested"
    }
  ];
}

export type CsiLanguageCoverage = {
  language: string;
  regions: string[];
  quality: "high" | "medium" | "low";
};

function normalizeLanguageCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(normalized)) return null;
  return normalized;
}

function normalizeLanguageCoverage(input: unknown): CsiLanguageCoverage[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const value = entry as Record<string, unknown>;
      const language = normalizeLanguageCode(value.language || value.code || value.isoCode);
      if (!language) return null;
      return {
        language,
        regions: Array.isArray(value.regions)
          ? value.regions.map((region) => String(region).trim()).filter(Boolean)
          : [],
        quality:
          value.quality === "high" || value.quality === "medium" || value.quality === "low"
            ? value.quality
            : "medium"
      } as CsiLanguageCoverage;
    })
    .filter(Boolean) as CsiLanguageCoverage[];
}

export async function fetchCsiRecommendations(
  user: DashboardUser
): Promise<DashboardRecommendation[]> {
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
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui"
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
          complianceProfile: user.complianceProfile
        }
      })
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
          priority: (model.priority === "high" || model.priority === "low"
            ? model.priority
            : "medium") as "low" | "medium" | "high",
          requiresApproval: Boolean(model.requiresApproval),
          approvalRole: (model.approvalRole === "founder" || model.approvalRole === "superadmin"
            ? model.approvalRole
            : "none") as "none" | "superadmin" | "founder",
          status: "suggested" as const
        };
      })
      .filter(Boolean) as DashboardRecommendation[];

    return normalized.length ? normalized : defaultRecommendations(user);
  } catch {
    return defaultRecommendations(user);
  }
}

export async function fetchCsiLanguageCoverage(
  user: DashboardUser
): Promise<CsiLanguageCoverage[]> {
  const endpoint = getGatewayEndpoint();
  if (!endpoint) {
    return [];
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-csi-reason-code": CSI_REASON_CODE,
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui"
      },
      cache: "no-store",
      body: JSON.stringify({
        subsystem: "localization",
        action: "advisory.language_coverage",
        userId: user.id,
        context: {
          role: user.role,
          tier: user.tier,
          preferredLanguage: user.preferredLanguage,
          complianceProfile: user.complianceProfile
        }
      })
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const data = payload.data;
    const candidates = normalizeLanguageCoverage(payload.languageCoverage)
      .concat(normalizeLanguageCoverage(data))
      .concat(
        data && typeof data === "object" && data !== null
          ? normalizeLanguageCoverage((data as Record<string, unknown>).languageCoverage)
          : []
      );

    const dedup = new Map<string, CsiLanguageCoverage>();
    const qualityRank: Record<CsiLanguageCoverage["quality"], number> = {
      low: 1,
      medium: 2,
      high: 3
    };
    for (const item of candidates) {
      const existing = dedup.get(item.language);
      if (!existing) {
        dedup.set(item.language, item);
        continue;
      }
      const nextQuality =
        qualityRank[existing.quality] >= qualityRank[item.quality]
          ? existing.quality
          : item.quality;
      dedup.set(item.language, {
        ...existing,
        regions: Array.from(new Set([...existing.regions, ...item.regions])),
        quality: nextQuality
      });
    }

    return Array.from(dedup.values());
  } catch {
    return [];
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
        "x-pulsco-source-app": "@pulsco/pulse-connect-ui"
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
          timestamp: event.timestamp
        }
      })
    });
  } catch {
    // Intentionally non-blocking. Dashboard writes should not fail on telemetry forwarding.
  }
}
