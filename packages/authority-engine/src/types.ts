export type DistributionChannel =
  | "owned-blog"
  | "developer-docs"
  | "medium"
  | "linkedin"
  | "github-pages"
  | "industry-directory"
  | "voice-assistant-feed";

export interface PublishableAsset {
  id: string;
  title: string;
  canonicalPath: string;
  summary: string;
  entities: string[];
  citationsReady: boolean;
}

export interface DistributionPlanItem {
  assetId: string;
  channel: DistributionChannel;
  endpoint: string;
  priority: number;
  thirdParty: boolean;
}

export interface CitationRecord {
  assetId: string;
  source: string;
  thirdParty: boolean;
  citedAt: number;
}

export interface AuthoritySnapshot {
  totalCitations: number;
  thirdPartyCitations: number;
  thirdPartyShare: number;
  citationVelocity: number;
  topSources: Array<{ source: string; count: number }>;
}
