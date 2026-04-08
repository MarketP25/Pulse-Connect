import {
  DashboardAiStatus,
  DashboardAlert,
  DashboardFeatureAccess,
  DashboardIdentityModule,
  DashboardModuleKey,
  DashboardProximityAdvancedModule,
  DashboardRecommendation,
  DashboardUser
} from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  user: DashboardUser;
  access: DashboardFeatureAccess[];
  recommendations: DashboardRecommendation[];
  alerts: DashboardAlert[];
  aiStatus?: DashboardAiStatus | null;
  identity?: DashboardIdentityModule;
  proximity?: DashboardProximityAdvancedModule;
};

type FlowState = "complete" | "in_progress" | "attention";

type FlowStep = {
  id: string;
  title: string;
  state: FlowState;
  description: string;
  highlights: string[];
};

const stateLabel: Record<FlowState, string> = {
  complete: "Complete",
  in_progress: "In Progress",
  attention: "Needs Attention"
};

const stateTone: Record<FlowState, string> = {
  complete: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  in_progress: "border-cyan-400/40 bg-cyan-500/10 text-cyan-100",
  attention: "border-amber-400/40 bg-amber-500/10 text-amber-100"
};

function isModuleEnabled(access: DashboardFeatureAccess[], module: DashboardModuleKey): boolean {
  return access.some((entry) => entry.module === module && entry.enabled);
}

function toStepData(
  user: DashboardUser,
  access: DashboardFeatureAccess[],
  recommendations: DashboardRecommendation[],
  alerts: DashboardAlert[],
  aiStatus: DashboardAiStatus | null | undefined,
  identity: DashboardIdentityModule | undefined,
  proximity: DashboardProximityAdvancedModule | undefined
): FlowStep[] {
  const paidTier = user.tier !== "basic";
  const profileComplete = Boolean(user.displayName && user.country && user.city);
  const registrationComplete = Boolean(user.id && user.emailHash);
  const verificationComplete = user.emailVerified && user.phoneVerified;
  const kycComplete = !paidTier || user.kycStatus === "verified";
  const twoFactorEnabled = Boolean(identity?.twoFactorEnabled);
  const aiLive = Boolean(aiStatus?.available && aiStatus.mode === "live");
  const keyModules: DashboardModuleKey[] = ["ecommerce", "matchmaking", "places", "communication"];
  const enabledModuleCount = keyModules.filter((module) => isModuleEnabled(access, module)).length;
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").length;

  return [
    {
      id: "registration",
      title: "Registration",
      state: registrationComplete ? "complete" : "attention",
      description:
        "Create user identity, secure credentials, and establish the base account record for downstream flows.",
      highlights: [
        `User ID: ${user.id}`,
        `Created: ${new Date(user.createdAt).toLocaleDateString()}`,
        `Tier: ${user.tier}`
      ]
    },
    {
      id: "verification",
      title: "Verification + KYC",
      state:
        verificationComplete && kycComplete
          ? "complete"
          : paidTier && !kycComplete
            ? "attention"
            : "in_progress",
      description:
        "Email/phone verification plus paid-tier KYC controls before premium commerce and matchmaking operations.",
      highlights: [
        `Email: ${user.emailVerified ? "verified" : "pending"}`,
        `Phone: ${user.phoneVerified ? "verified" : "pending"}`,
        `KYC: ${user.kycStatus}`
      ]
    },
    {
      id: "profile",
      title: "Profile + Localization",
      state: profileComplete ? "complete" : "in_progress",
      description:
        "Capture profile fields and language preferences so recommendations, pricing, and content are localized.",
      highlights: [
        `Display Name: ${user.displayName || "pending"}`,
        `Location: ${user.city || "-"}, ${user.country || "-"}`,
        `Language: ${user.preferredLanguage}`
      ]
    },
    {
      id: "vault",
      title: "Data Vault + Security",
      state:
        twoFactorEnabled && (!proximity || proximity.health.status === "healthy")
          ? "complete"
          : twoFactorEnabled
            ? "in_progress"
            : "attention",
      description:
        "Protect sessions with 2FA, maintain PC365 integrity posture, and monitor proximity system health telemetry.",
      highlights: [
        `2FA: ${twoFactorEnabled ? "enabled" : "pending"}`,
        `Proximity Health: ${proximity?.health.status || "unknown"}`,
        `Latency: ${proximity?.health.latencyMs || 0}ms`
      ]
    },
    {
      id: "intelligence",
      title: "Pulsco AI + CSI",
      state:
        aiLive && recommendations.length > 0
          ? "complete"
          : recommendations.length > 0
            ? "in_progress"
            : "attention",
      description:
        "Backend chatbot channels requests into the AI engine, with CSI advisory context for policy-aware recommendations.",
      highlights: [
        `Provider: ${aiStatus?.provider || "pulsco-ai-fallback"}`,
        `Mode: ${aiStatus?.mode || "fallback"}`,
        `Recommendations: ${recommendations.length}`
      ]
    },
    {
      id: "activation",
      title: "Dashboard Activation",
      state: enabledModuleCount === keyModules.length ? "complete" : "in_progress",
      description:
        "Enable ecommerce, places, matchmaking, and communication by tier policy while preserving role-agnostic access.",
      highlights: [
        `Enabled Key Modules: ${enabledModuleCount}/${keyModules.length}`,
        `Alerts: ${alerts.length}`,
        `Critical Alerts: ${criticalAlerts}`
      ]
    }
  ];
}

export function SystemFlowPanel({
  title,
  user,
  access,
  recommendations,
  alerts,
  aiStatus,
  identity,
  proximity
}: Props) {
  const steps = toStepData(user, access, recommendations, alerts, aiStatus, identity, proximity);
  const completeCount = steps.filter((step) => step.state === "complete").length;
  const completionRatio = Math.round((completeCount / Math.max(steps.length, 1)) * 100);

  return (
    <SectionCard
      title={title}
      subtitle="Advanced user-to-intelligence workflow with verification, security, proximity, and CSI-aware AI routing."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pulse-cyan-500/25 bg-nebula-900/60 p-3">
        <p className="text-sm text-slate-300">
          Flow Completion: <span className="font-semibold text-pulse-cyan-300">{completionRatio}%</span>
        </p>
        <p className="text-sm text-slate-300">
          Completed Stages: <span className="font-semibold text-tech-white">{completeCount}</span> /{" "}
          {steps.length}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <article
            key={step.id}
            className="rounded-xl border border-nebula-500/60 bg-nebula-900/60 p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-tech-white">{step.title}</p>
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-medium ${stateTone[step.state]}`}
              >
                {stateLabel[step.state]}
              </span>
            </div>
            <p className="text-xs text-slate-300">{step.description}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {step.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
