import { DashboardFraudModule, DashboardReportingModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  reporting?: DashboardReportingModule;
  fraud?: DashboardFraudModule;
  enabled: boolean;
  disabledReason?: string;
};

export function ReportingPanel({ title, reporting, fraud, enabled, disabledReason }: Props) {
  return (
    <SectionCard title={title} subtitle="Revenue reporting, performance latency, and fraud risk analytics.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Reporting is restricted for this account."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Revenue Summary</p>
            <article className="rounded-lg border border-slate-200 p-3">
              <p>Gross: ${reporting?.revenueSummary.grossUsd?.toLocaleString() || 0}</p>
              <p>Net: ${reporting?.revenueSummary.netUsd?.toLocaleString() || 0}</p>
              <p>Orders: {reporting?.revenueSummary.orders || 0}</p>
              <p>Latency: {reporting?.performanceLatencyMs || 0}ms</p>
            </article>

            <p className="font-semibold text-slate-900">Trend (latest 6)</p>
            <div className="space-y-1">
              {(reporting?.revenueTrends || []).map((point) => (
                <div key={point.label} className="rounded border border-slate-200 px-2 py-1">
                  {point.label}: ${point.value.toLocaleString()}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Fraud Signals</p>
            <article className="rounded-lg border border-slate-200 p-3">
              <p>Risk score: {fraud?.riskScore ?? 0}</p>
              <p>Anomalies: {(fraud?.anomalies || reporting?.anomalies || []).length}</p>
            </article>
            <div className="space-y-1">
              {(fraud?.anomalies || reporting?.anomalies || []).slice(0, 8).map((anomaly) => (
                <div key={anomaly.id} className="rounded border border-slate-200 px-2 py-1">
                  <p className="font-semibold text-slate-900">{anomaly.type}</p>
                  <p>{anomaly.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

