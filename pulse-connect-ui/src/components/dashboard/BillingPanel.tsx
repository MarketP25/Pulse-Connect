"use client";

import { DashboardBillingModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  billing?: DashboardBillingModule;
  loading: boolean;
  onRunAction: (action: "create" | "renew" | "upgrade" | "cancel", payload?: Record<string, unknown>) => Promise<void>;
};

export function BillingPanel({ title, billing, loading, onRunAction }: Props) {
  return (
    <SectionCard title={title} subtitle="Subscription lifecycle actions, ledger visibility, and policy versions.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Subscription</p>
          <article className="rounded-lg border border-slate-200 p-3">
            <p>Tier: {billing?.subscription.tier || "basic"}</p>
            <p>Status: {billing?.subscription.status || "active"}</p>
            <p>Region: {billing?.subscription.region || "US"}</p>
            <p>Renewal: {billing?.subscription.renewalAt ? new Date(billing.subscription.renewalAt).toLocaleString() : "N/A"}</p>
          </article>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              onClick={() => onRunAction("renew")}
              disabled={loading}
            >
              Renew
            </button>
            <button
              className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              onClick={() => onRunAction("upgrade", { tier: "premium" })}
              disabled={loading}
            >
              Upgrade to Premium
            </button>
            <button
              className="rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
              onClick={() => onRunAction("cancel")}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Ledger</p>
          {(billing?.ledgerEntries || []).slice(0, 8).map((entry) => (
            <article key={entry.id} className="rounded-lg border border-slate-200 p-2">
              <p>
                {entry.type} | ${entry.amountUsd.toLocaleString()} | Balance ${entry.balanceUsd.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
            </article>
          ))}

          <p className="mt-2 font-semibold text-slate-900">Policy Versions</p>
          {(billing?.policyVersions || []).map((policy) => (
            <article key={policy.version} className="rounded-lg border border-slate-200 p-2">
              <p>
                {policy.version} ({policy.status})
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

