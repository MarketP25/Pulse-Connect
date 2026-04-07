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

export function InsightsPanel({ title, recommendations, alerts }: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="PULSCO AI + CSI recommendations, fraud alerts, and optimization signals."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-900">Recommendations</p>
          {recommendations.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {item.source}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
              <p className="mt-1 text-xs text-slate-500">
                Priority: {item.priority} | Approval: {item.approvalRole}
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
