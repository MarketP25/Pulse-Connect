import { DashboardGovernanceModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardGovernanceModule;
  enabled: boolean;
  disabledReason?: string;
  loading: boolean;
  onRequestArbitration: () => Promise<void>;
  onReviewRecommendation: (recommendationId: string, decision: "approved" | "rejected") => Promise<void>;
};

export function GovernancePanel({
  title,
  data,
  enabled,
  disabledReason,
  loading,
  onRequestArbitration,
  onReviewRecommendation,
}: Props) {
  return (
    <SectionCard title={title} subtitle="CSI recommendation approvals, MARP policy posture, firewall coverage, and arbitration.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Governance features are restricted."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">CSI Approval Queue</p>
            {(data?.csiApprovals || []).map((recommendation) => (
              <article key={recommendation.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{recommendation.title}</p>
                <p>{recommendation.detail}</p>
                <p className="text-xs text-slate-500">
                  Approval role: {recommendation.approvalRole} | Status: {recommendation.status}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    className="rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    onClick={() => onReviewRecommendation(recommendation.id, "approved")}
                    disabled={loading}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                    onClick={() => onReviewRecommendation(recommendation.id, "rejected")}
                    disabled={loading}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">MARP Overview</p>
            <article className="rounded-lg border border-slate-200 p-3">
              <p>Policy versions: {(data?.policyVersions || []).join(", ") || "N/A"}</p>
              <p>Firewall rules: {data?.firewallRuleCount || 0}</p>
            </article>

            <p className="font-semibold text-slate-900">Arbitrations</p>
            {(data?.arbitrations || []).map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-2">
                <p>
                  {item.id.slice(0, 8)} | {item.status}
                </p>
              </article>
            ))}

            <button
              className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
              onClick={() => onRequestArbitration()}
              disabled={loading}
            >
              Request Arbitration
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

