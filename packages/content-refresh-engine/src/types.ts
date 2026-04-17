import { ContentGenerationRequest, GeneratedContentAsset } from "@pulsco/aseo-content-engine";

export interface RefreshCandidate {
  path: string;
  topic: string;
  primaryKeyword: string;
  language: string;
  kind: ContentGenerationRequest["kind"];
  valueScore: number;
  trafficDelta: number;
  citationTrend: number;
  lastUpdatedAt: number;
}

export interface RefreshPlanItem {
  path: string;
  priorityScore: number;
  reason: string;
  refreshBy: number;
  request: ContentGenerationRequest;
}

export interface RefreshExecution {
  plan: RefreshPlanItem[];
  refreshedAssets: GeneratedContentAsset[];
}
