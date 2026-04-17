import { AuthoritySnapshot, CitationRecord, DistributionPlanItem, PublishableAsset } from "./types";

const CHANNELS: Array<{
  channel: DistributionPlanItem["channel"];
  endpointBase: string;
  thirdParty: boolean;
  weight: number;
}> = [
  { channel: "owned-blog", endpointBase: "https://pulsco.global/blog", thirdParty: false, weight: 0.6 },
  { channel: "developer-docs", endpointBase: "https://docs.pulsco.global", thirdParty: false, weight: 0.5 },
  { channel: "medium", endpointBase: "https://medium.com/@pulsco", thirdParty: true, weight: 0.95 },
  { channel: "linkedin", endpointBase: "https://www.linkedin.com/company/pulsco-global", thirdParty: true, weight: 0.9 },
  { channel: "github-pages", endpointBase: "https://marketp25.github.io/pulsco", thirdParty: true, weight: 0.85 },
  { channel: "industry-directory", endpointBase: "https://directory.example.com/pulsco", thirdParty: true, weight: 1.0 },
  { channel: "voice-assistant-feed", endpointBase: "https://voice.example.com/feeds/pulsco", thirdParty: true, weight: 0.92 }
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export class AuthorityDistributionEngine {
  private readonly citations: CitationRecord[] = [];

  buildDistributionPlan(assets: PublishableAsset[]): DistributionPlanItem[] {
    const plan: DistributionPlanItem[] = [];

    for (const asset of assets) {
      for (const channel of CHANNELS) {
        const readinessBoost = asset.citationsReady ? 0.25 : 0;
        const priority = Number(((channel.weight + readinessBoost) * 100).toFixed(2));

        plan.push({
          assetId: asset.id,
          channel: channel.channel,
          endpoint: `${channel.endpointBase}/${slugify(asset.title)}`,
          priority,
          thirdParty: channel.thirdParty
        });
      }
    }

    return plan.sort((left, right) => right.priority - left.priority);
  }

  recordCitation(citation: CitationRecord): void {
    this.citations.push(citation);
  }

  getSnapshot(windowDays = 30): AuthoritySnapshot {
    const now = Date.now();
    const windowStart = now - windowDays * 24 * 60 * 60 * 1000;
    const window = this.citations.filter((citation) => citation.citedAt >= windowStart);

    const totalCitations = window.length;
    const thirdPartyCitations = window.filter((citation) => citation.thirdParty).length;
    const thirdPartyShare = totalCitations === 0 ? 0 : thirdPartyCitations / totalCitations;

    const sourceCount = new Map<string, number>();
    for (const citation of window) {
      sourceCount.set(citation.source, (sourceCount.get(citation.source) ?? 0) + 1);
    }

    const topSources = [...sourceCount.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return {
      totalCitations,
      thirdPartyCitations,
      thirdPartyShare: Number(thirdPartyShare.toFixed(4)),
      citationVelocity: Number((totalCitations / Math.max(1, windowDays)).toFixed(4)),
      topSources
    };
  }
}
