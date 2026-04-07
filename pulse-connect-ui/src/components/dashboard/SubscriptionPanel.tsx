"use client";

import { DashboardTier, DashboardUser } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  tierLabels: { basic: string; premium: string; enterprise: string };
  kycRequiredLabel: string;
  completeKycLabel: string;
  user: DashboardUser;
  onTierChange: (tier: DashboardTier) => Promise<void>;
  onCompleteKyc: () => Promise<void>;
  loading: boolean;
};

const tiers: DashboardTier[] = ["basic", "premium", "enterprise"];

export function SubscriptionPanel({
  title,
  tierLabels,
  kycRequiredLabel,
  completeKycLabel,
  user,
  onTierChange,
  onCompleteKyc,
  loading
}: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="Upgrade or downgrade tiers, view KYC state, and enforce paid-tier compliance."
    >
      <div className="grid gap-3 md:grid-cols-3">
        {tiers.map((tier) => {
          const active = tier === user.tier;
          return (
            <button
              key={tier}
              className={`rounded-xl border px-4 py-3 text-left ${active ? "border-sky-600 bg-sky-50" : "border-slate-300 bg-white"}`}
              onClick={() => onTierChange(tier)}
              disabled={loading}
            >
              <p className="text-sm font-semibold text-slate-900">
                {tier === "basic"
                  ? tierLabels.basic
                  : tier === "premium"
                    ? tierLabels.premium
                    : tierLabels.enterprise}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                {active ? "Current tier" : "Switch tier"}
              </p>
            </button>
          );
        })}
      </div>

      {(user.tier === "premium" || user.tier === "enterprise") && user.kycStatus !== "verified" ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <p>{kycRequiredLabel}</p>
          <button
            className="mt-2 rounded bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
            onClick={onCompleteKyc}
            disabled={loading}
          >
            {completeKycLabel}
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}
