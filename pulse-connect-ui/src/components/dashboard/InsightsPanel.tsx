import { DashboardAlert, DashboardRecommendation } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  recommendations: DashboardRecommendation[];
  alerts: DashboardAlert[];
};

const alertTone: Record<DashboardAlert["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-rose-200 bg-rose-50 text-rose-900"
};

const priorityTone: Record<DashboardRecommendation["priority"], string> = {
  low: "border-emerald-300 bg-emerald-50 text-emerald-800",
  medium: "border-sky-300 bg-sky-50 text-sky-800",
  high: "border-amber-300 bg-amber-50 text-amber-800"
};

export function InsightsPanel({ title, recommendations, alerts }: Props) {
  const suggested = recommendations.filter((item) => item.status === "suggested");
  const approvalQueue = recommendations.filter(
    (item) => item.requiresApproval && item.status === "suggested"
  );
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical");

  return (
    <SectionCard
      title={title}
      subtitle="PULSCO AI + CSI recommendations, fraud alerts, and optimization signals."
    >
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">Suggested Actions</p>
          <p className="text-xl font-semibold text-tech-white">{suggested.length}</p>
        </article>
        <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">Approval Queue</p>
          <p className="text-xl font-semibold text-tech-white">{approvalQueue.length}</p>
        </article>
        <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-wide text-slate-400">Critical Alerts</p>
          <p className="text-xl font-semibold text-tech-white">{criticalAlerts.length}</p>
        </article>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Recommendations</p>
          {recommendations.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <span className={`rounded border px-2 py-0.5 text-xs ${priorityTone[item.priority]}`}>
                  {item.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              <p className="mt-1 text-xs text-slate-500">
                Source: {item.source} | Approval: {item.approvalRole} | Status: {item.status}
              </p>
            </article>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Alerts</p>
          {alerts.map((alert) => (
            <article
              key={alert.id}
              className={`rounded-lg border p-3 ${alertTone[alert.severity]}`}
            >
              <p className="text-sm font-semibold">{alert.type.toUpperCase()}</p>
              <p className="text-sm">{alert.message}</p>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
