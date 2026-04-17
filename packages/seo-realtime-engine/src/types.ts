export interface PagePerformanceSignal {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  targetKeyword: string;
  averagePosition: number;
  positionDelta: number;
  trafficDelta: number;
  ctr: number;
}

export interface SEOAdjustment {
  path: string;
  title?: string;
  metaDescription?: string;
  h1?: string;
  reasons: string[];
  severity: "low" | "medium" | "high";
  generatedAt: number;
}

export interface TriggerSignal {
  region: string;
  query: string;
  urgency: "low" | "medium" | "high";
}
