import type { KeywordSignal } from "@pulsco/aseo-core";

export interface RegionalDemandInsight {
  region: string;
  dominantQuery: string;
  demandScore: number;
  eventCount: number;
}

export interface ContentTrigger {
  region: string;
  query: string;
  recommendation: string;
  urgency: "low" | "medium" | "high";
}

export interface AdapterSnapshot {
  signals: KeywordSignal[];
  demandInsights: RegionalDemandInsight[];
  triggers: ContentTrigger[];
}
