import { DashboardProximityAdvancedModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardProximityAdvancedModule;
  enabled: boolean;
  disabledReason?: string;
};

export function ProximityAdvancedPanel({ title, data, enabled, disabledReason }: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="Proximity health, rules, and geospatial metrics for operational visibility."
    >
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {disabledReason || "Proximity analytics unavailable."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Health</p>
            <article className="rounded-lg border border-slate-200 p-3">
              <p>Status: {data?.health.status || "unknown"}</p>
              <p>Latency: {data?.health.latencyMs || 0}ms</p>
            </article>
            <p className="font-semibold text-slate-900">Rules</p>
            {(data?.rules || []).map((rule) => (
              <article key={rule.id} className="rounded-lg border border-slate-200 p-2">
                <p>
                  {rule.name}: {rule.value}
                </p>
              </article>
            ))}
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Metrics</p>
            {(data?.metrics || []).map((metric) => (
              <article key={metric.name} className="rounded-lg border border-slate-200 p-2">
                <p>
                  {metric.name}: {metric.value.toLocaleString()}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
