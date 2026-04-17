export interface EdgeNode {
  id: string;
  region: string;
  countries: string[];
  languages: string[];
  medianLatencyMs: number;
}

export interface DeliveryRequest {
  country: string;
  path: string;
  acceptedLanguages: string[];
}

export interface DeliveryDecision {
  edgeNodeId: string;
  region: string;
  language: string;
  localizedPath: string;
  cacheKey: string;
}
