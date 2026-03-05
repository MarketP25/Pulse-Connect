import { MarketingCampaignMetric } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  campaigns: MarketingCampaignMetric[];
  enabled: boolean;
  disabledReason?: string;
};

function ctr(campaign: MarketingCampaignMetric): number {
  if (!campaign.impressions) {
    return 0;
  }
  return Number(((campaign.clicks / campaign.impressions) * 100).toFixed(2));
}

export function MarketingPanel({ title, campaigns, enabled, disabledReason }: Props) {
  return (
    <SectionCard title={title} subtitle="Automated campaigns, analytics, and performance tracking.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Not available for this tier."}</p>
      ) : (
        <div className="space-y-2 text-sm">
          {campaigns.length === 0 ? <p className="text-slate-600">No campaigns available. Enable marketing consent.</p> : null}
          {campaigns.map((campaign) => (
            <article key={campaign.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-900">{campaign.campaignName}</p>
              <p className="text-slate-600">
                Impressions: {campaign.impressions.toLocaleString()} | Clicks: {campaign.clicks.toLocaleString()} | Conversions: {campaign.conversions.toLocaleString()}
              </p>
              <p className="text-slate-600">CTR: {ctr(campaign)}% | Spend: ${campaign.spendUsd.toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
