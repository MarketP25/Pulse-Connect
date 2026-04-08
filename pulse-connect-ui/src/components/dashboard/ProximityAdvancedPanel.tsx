import { DashboardProximityAdvancedModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardProximityAdvancedModule;
  enabled: boolean;
  disabledReason?: string;
};

const healthTone: Record<DashboardProximityAdvancedModule["health"]["status"], string> = {
  healthy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  degraded: "border-amber-400/40 bg-amber-500/10 text-amber-100",
  unhealthy: "border-rose-400/40 bg-rose-500/10 text-rose-100"
};

function findRuleValue(data: DashboardProximityAdvancedModule | undefined, name: string): string {
  return data?.rules.find((rule) => rule.name === name)?.value || "n/a";
}

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
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Service Health</p>
              <span
                className={`mt-2 inline-block rounded-md border px-2 py-0.5 text-xs ${
                  healthTone[data?.health.status || "degraded"]
                }`}
              >
                {data?.health.status || "unknown"}
              </span>
            </article>
            <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Latency</p>
              <p className="mt-2 text-xl font-semibold text-tech-white">{data?.health.latencyMs || 0}ms</p>
            </article>
            <article className="rounded-lg border border-nebula-500/70 bg-nebula-900/60 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Max Radius Rule</p>
              <p className="mt-2 text-xl font-semibold text-tech-white">
                {findRuleValue(data, "max-radius-km")} km
              </p>
            </article>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-700">
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
        </div>
      )}
    </SectionCard>
  );
}
