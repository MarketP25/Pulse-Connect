export interface AICoordinationResult {
  predictions: UserPrediction[];
  routing: RoutingOptimization;
  policies: PolicyAdaptation[];
  insights: PlanetaryInsights;
  timestamp: Date;
}

export interface UserPrediction {
  userId: string;
  type:
    | "subsystem_recommendation"
    | "time_optimization"
    | "location_based"
    | "behavior_pattern"
    | "risk_alert";
  target: string;
  confidence: number;
  reasoning: string;
  suggestedAction: string;
  metadata?: any;
}

export interface RoutingOptimization {
  route: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  context: any;
}

export interface PolicyAdaptation {
  policyId: string;
  type: "temporary_restriction" | "enhanced_monitoring" | "permission_grant";
  scope: string[];
  conditions: any;
  actions: string[];
  reasoning: string;
  confidence: number;
}

export interface PlanetaryInsights {
  patterns: Pattern[];
  anomalies: Anomaly[];
  trends: Trend[];
  correlations: Correlation[];
  predictions: Prediction[];
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  affectedEntities: string[];
  frequency: number;
  impact: "low" | "medium" | "high" | "critical";
}

export interface Anomaly {
  id: string;
  type: string;
  severity: number;
  description: string;
  affectedSystems: string[];
  detectionTime: Date;
  confidence: number;
}

export interface Trend {
  id: string;
  metric: string;
  direction: "increasing" | "decreasing" | "stable";
  rate: number;
  timeframe: string;
  significance: number;
}

export interface Correlation {
  id: string;
  entities: string[];
  strength: number;
  type: string;
  description: string;
  confidence: number;
}

export interface Prediction {
  id: string;
  type: string;
  target: string;
  probability: number;
  timeframe: string;
  impact: string;
  confidence: number;
}

export interface RequestContext {
  userId: string;
  location?: {
    country: string;
    region: string;
    coordinates?: { lat: number; lng: number };
  };
  requestType: string;
  timeOfDay: {
    hour: number;
    day: number;
    timezone: string;
  };
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
  };
  userHistory: {
    recentActions: string[];
    sessionDuration: number;
    subsystemUsage: Record<string, number>;
  };
}

export interface PlanetaryData {
  events: any[];
  metrics: Record<string, any>;
  correlations: Correlation[];
  timeframe: {
    start: Date;
    end: Date;
  };
  scope: "global" | "regional" | "local";
}
