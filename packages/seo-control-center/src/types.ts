import type { CSIEvent } from "@pulsco/csi";
import type { KeywordSignal } from "@pulsco/aseo-core";
import type { ProgrammaticSEOInput } from "@pulsco/programmatic-seo";
import type { PagePerformanceSignal } from "@pulsco/seo-realtime-engine";
import type { RefreshCandidate } from "@pulsco/content-refresh-engine";
import type { DeliveryRequest } from "@pulsco/gso-delivery-engine";

export interface DiscoveryCycleInput {
  cycleId: string;
  actorId: string;
  searchTrendSignals: KeywordSignal[];
  csiEvents: CSIEvent[];
  programmaticInput: ProgrammaticSEOInput;
  performanceSignals: PagePerformanceSignal[];
  refreshCandidates: RefreshCandidate[];
  deliveryRequests: DeliveryRequest[];
}

export interface DashboardSnapshot {
  timestamp: number;
  rankings: {
    averagePosition: number;
    droppedPages: number;
    improvedPages: number;
  };
  aiCitations: {
    total: number;
    thirdPartyShare: number;
    velocity: number;
  };
  traffic: {
    averageDelta: number;
    decliningPages: number;
    stableOrGrowingPages: number;
  };
  contentHealth: {
    generatedAssets: number;
    schemaCoverage: number;
    avgExtractability: number;
    refreshQueued: number;
  };
  csiInsights: {
    triggerCount: number;
    highUrgencyTriggers: number;
    topRegions: string[];
  };
}

export interface DiscoveryCycleResult {
  cycleId: string;
  deployed: boolean;
  auditId: string;
  violations: string[];
  dashboard: DashboardSnapshot;
  summary: {
    keywordInsights: number;
    csiDirectives: number;
    generatedAssets: number;
    programmaticPages: number;
    realtimeAdjustments: number;
    refreshPlanned: number;
    linksGenerated: number;
  };
}
