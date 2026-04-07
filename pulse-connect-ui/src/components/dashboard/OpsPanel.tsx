import { DashboardBackupSnapshot, DashboardOpsMetric } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  metrics: DashboardOpsMetric[];
  backups: DashboardBackupSnapshot[];
  enabled: boolean;
  disabledReason?: string;
};

export function OpsPanel({ title, metrics, backups, enabled, disabledReason }: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="Module monitoring, request telemetry, and automated backup snapshots."
    >
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {disabledReason || "Operations visibility is enterprise-only."}
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Monitoring</p>
            <div className="space-y-2 text-sm text-slate-700">
              {metrics.map((metric) => (
                <article key={metric.module} className="rounded-lg border border-slate-200 p-2">
                  <p className="font-semibold text-slate-900">{metric.module}</p>
                  <p>
                    Requests: {metric.totalRequests} | Failures: {metric.failedRequests} | Avg
                    latency: {metric.avgLatencyMs}ms
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Backups</p>
            <div className="space-y-2 text-sm text-slate-700">
              {backups.map((backup) => (
                <article key={backup.id} className="rounded-lg border border-slate-200 p-2">
                  <p className="font-semibold text-slate-900">{backup.reason}</p>
                  <p>
                    {new Date(backup.createdAt).toLocaleString()} | Users: {backup.userCount} |
                    Purchases: {backup.purchaseCount}
                  </p>
                  <p className="text-xs text-slate-500">
                    Signature: {backup.signature.slice(0, 18)}...
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
