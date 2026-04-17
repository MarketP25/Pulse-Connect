import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname } from "path";
import {
  CSIGovernanceEngine,
  CSIAnalysisEngine,
  CSIScoringEngine,
  CSIRecommendationEngine,
  CSISEODirectiveEngine,
  CSIIntelligenceVault,
  InMemorySecureDatabaseAdapter,
  CSIEvent,
  GovernanceDecision
} from "@pulsco/csi";
import { PlanetaryDiscoverySystem } from "@pulsco/seo-control-center";
import type {
  DiscoveryCycleInput,
  DiscoveryCycleResult
} from "@pulsco/seo-control-center";
import type { KeywordSignal } from "@pulsco/aseo-core";
import type { PagePerformanceSignal } from "@pulsco/seo-realtime-engine";
import type { RefreshCandidate } from "@pulsco/content-refresh-engine";
import type { DeliveryRequest } from "@pulsco/gso-delivery-engine";
import type { ProgrammaticSEOInput } from "@pulsco/programmatic-seo";

export interface ServiceConfig {
  stateFilePath: string;
  historyLimit: number;
  cycleActorId: string;
}

export interface DiscoveryFeeds {
  loadSearchTrendSignals(): Promise<KeywordSignal[]>;
  loadCSIEvents(): Promise<CSIEvent[]>;
  loadProgrammaticInput(): Promise<ProgrammaticSEOInput>;
  loadPerformanceSignals(): Promise<PagePerformanceSignal[]>;
  loadRefreshCandidates(): Promise<RefreshCandidate[]>;
  loadDeliveryRequests(): Promise<DeliveryRequest[]>;
}

export interface PersistedCycleEnvelope {
  cycleId: string;
  reason: "scheduled" | "manual";
  startedAt: number;
  completedAt: number;
  result: DiscoveryCycleResult;
  csi: {
    analysis: ReturnType<CSIAnalysisEngine["analyzeCurrentWindow"]>;
    scores: ReturnType<CSIScoringEngine["score"]>;
    recommendations: ReturnType<CSIRecommendationEngine["build"]>;
    directives: ReturnType<CSISEODirectiveEngine["build"]>;
    governanceDecisions: GovernanceDecision[];
  };
}

export interface PersistedState {
  version: string;
  latest?: PersistedCycleEnvelope;
  cycles: PersistedCycleEnvelope[];
}

const EMPTY_STATE: PersistedState = {
  version: "1.0.0",
  cycles: []
};

function now(): number {
  return Date.now();
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return value;
}

export class JsonStateStore {
  private readonly filePath: string;
  private readonly historyLimit: number;

  constructor(filePath: string, historyLimit: number) {
    this.filePath = filePath;
    this.historyLimit = Math.max(20, historyLimit);
  }

  async load(): Promise<PersistedState> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (!parsed || typeof parsed !== "object") {
        return EMPTY_STATE;
      }

      const cycles = Array.isArray(parsed.cycles) ? parsed.cycles : [];
      return {
        version: typeof parsed.version === "string" ? parsed.version : "1.0.0",
        latest: parsed.latest,
        cycles: cycles.slice(-this.historyLimit)
      };
    } catch {
      return EMPTY_STATE;
    }
  }

  async save(envelope: PersistedCycleEnvelope): Promise<PersistedState> {
    const state = await this.load();
    const cycles = [...state.cycles, envelope].slice(-this.historyLimit);

    const next: PersistedState = {
      version: "1.0.0",
      latest: envelope,
      cycles
    };

    await mkdir(dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(next, null, 2), "utf8");
    await rename(tempPath, this.filePath);

    return next;
  }
}

export class DiscoveryEngineRuntime {
  private readonly config: ServiceConfig;
  private readonly feeds: DiscoveryFeeds;
  private readonly stateStore: JsonStateStore;
  private readonly discovery = new PlanetaryDiscoverySystem();
  private readonly csiAnalysis = new CSIAnalysisEngine(10_000);
  private readonly csiScoring = new CSIScoringEngine();
  private readonly csiRecommendations = new CSIRecommendationEngine();
  private readonly csiDirectives = new CSISEODirectiveEngine();
  private readonly csiVault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
  private readonly csiGovernance = new CSIGovernanceEngine(this.csiVault);
  private executing = false;
  private lastState: PersistedState = EMPTY_STATE;

  constructor(config: ServiceConfig, feeds: DiscoveryFeeds) {
    this.config = config;
    this.feeds = feeds;
    this.stateStore = new JsonStateStore(config.stateFilePath, config.historyLimit);
  }

  async init(): Promise<void> {
    this.lastState = await this.stateStore.load();
  }

  isExecuting(): boolean {
    return this.executing;
  }

  getState(): PersistedState {
    return this.lastState;
  }

  async runCycle(
    reason: "scheduled" | "manual",
    override?: Partial<DiscoveryCycleInput>
  ): Promise<PersistedCycleEnvelope> {
    if (this.executing) {
      throw new Error("A discovery cycle is already running");
    }

    this.executing = true;
    const startedAt = now();

    try {
      const csiEvents = override?.csiEvents ?? (await this.feeds.loadCSIEvents());
      const searchTrendSignals =
        override?.searchTrendSignals ?? (await this.feeds.loadSearchTrendSignals());
      const programmaticInput =
        override?.programmaticInput ?? (await this.feeds.loadProgrammaticInput());
      const performanceSignals =
        override?.performanceSignals ?? (await this.feeds.loadPerformanceSignals());
      const refreshCandidates =
        override?.refreshCandidates ?? (await this.feeds.loadRefreshCandidates());
      const deliveryRequests =
        override?.deliveryRequests ?? (await this.feeds.loadDeliveryRequests());

      const analysis = this.csiAnalysis.analyzeBatch(csiEvents);
      const scores = this.csiScoring.score(csiEvents);
      const recommendations = this.csiRecommendations.build({
        analysis,
        scores: scores.subsystemScores
      });
      const directives = this.csiDirectives.build(csiEvents, { minPriority: "medium" });

      const context = {
        actorId: this.config.cycleActorId,
        actorRole: "superadmin",
        pc365Attestation: "pc365_attestation_token_12345"
      };

      await this.csiVault.storeAggregatedIntelligence(
        {
          csiSummary: analysis.summary,
          directives,
          recommendationCount: recommendations.length,
          generatedAt: now()
        },
        context
      );

      const governanceDecisions: GovernanceDecision[] = [];
      for (const directive of directives.slice(0, 5)) {
        const estimatedRisk =
          directive.priority === "critical"
            ? 85
            : directive.priority === "high"
              ? 70
              : directive.priority === "medium"
                ? 45
                : 20;

        const decision = await this.csiGovernance.evaluateProposal(
          {
            title: `ASEO directive for ${directive.region}`,
            subsystem: "marketing",
            description: directive.rationale,
            requestedBy: this.config.cycleActorId,
            requestedByRole: "superadmin",
            estimatedRisk,
            guardrailsCompliant: true,
            strategic: directive.priority === "critical"
          },
          context,
          {
            runSimulation: false
          }
        );

        governanceDecisions.push(decision);
      }

      const directiveSignals: KeywordSignal[] = directives.map((directive) => ({
        keyword: directive.query,
        region: directive.region,
        language: "en",
        source: "csi-query",
        volume: directive.priority === "critical" ? 180 : directive.priority === "high" ? 120 : 70,
        momentum: directive.priority === "critical" ? 0.8 : directive.priority === "high" ? 0.55 : 0.3,
        difficulty: 0.45,
        timestamp: directive.createdAt
      }));

      const cycleInput: DiscoveryCycleInput = {
        cycleId: override?.cycleId ?? `cycle_${new Date(startedAt).toISOString()}`,
        actorId: override?.actorId ?? this.config.cycleActorId,
        csiEvents,
        searchTrendSignals: [...searchTrendSignals, ...directiveSignals],
        programmaticInput,
        performanceSignals,
        refreshCandidates,
        deliveryRequests
      };

      const result = this.discovery.runCycle(cycleInput);

      const envelope: PersistedCycleEnvelope = {
        cycleId: cycleInput.cycleId,
        reason,
        startedAt,
        completedAt: now(),
        result,
        csi: {
          analysis,
          scores,
          recommendations,
          directives,
          governanceDecisions
        }
      };

      this.lastState = await this.stateStore.save(envelope);
      return envelope;
    } finally {
      this.executing = false;
    }
  }
}

function cleanString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function toKeywordSignal(value: unknown): KeywordSignal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const keyword = cleanString(row.keyword);
  const region = cleanString(row.region);
  if (!keyword || !region) {
    return null;
  }

  return {
    keyword,
    region,
    language: cleanString(row.language) ?? "en",
    source:
      row.source === "search-trend" || row.source === "csi-query" || row.source === "first-party-analytics"
        ? row.source
        : "search-trend",
    volume: safeNumber(row.volume, 1),
    momentum: safeNumber(row.momentum, 0),
    difficulty: typeof row.difficulty === "number" ? row.difficulty : undefined,
    timestamp: safeNumber(row.timestamp, now())
  };
}

function toCSIEvent(value: unknown): CSIEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const subsystem = cleanString(row.subsystem);
  const eventType = cleanString(row.eventType);
  const region = cleanString(row.region);
  if (!subsystem || !eventType || !region) {
    return null;
  }

  const metrics =
    row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
      ? (row.metrics as Record<string, unknown>)
      : {};

  return {
    subsystem,
    eventType,
    region,
    timestamp: safeNumber(row.timestamp, now()),
    metrics,
    riskScore: typeof row.riskScore === "number" ? row.riskScore : undefined,
    performanceScore: typeof row.performanceScore === "number" ? row.performanceScore : undefined
  };
}

function toPerformanceSignal(value: unknown): PagePerformanceSignal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const path = cleanString(row.path);
  const targetKeyword = cleanString(row.targetKeyword);
  if (!path || !targetKeyword) {
    return null;
  }

  return {
    path,
    title: cleanString(row.title) ?? "",
    metaDescription: cleanString(row.metaDescription) ?? "",
    h1: cleanString(row.h1) ?? "",
    targetKeyword,
    averagePosition: safeNumber(row.averagePosition, 50),
    positionDelta: safeNumber(row.positionDelta, 0),
    trafficDelta: safeNumber(row.trafficDelta, 0),
    ctr: safeNumber(row.ctr, 0.01)
  };
}

function toRefreshCandidate(value: unknown): RefreshCandidate | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const path = cleanString(row.path);
  const topic = cleanString(row.topic);
  const primaryKeyword = cleanString(row.primaryKeyword);
  const language = cleanString(row.language);
  const kind = row.kind;

  if (!path || !topic || !primaryKeyword || !language) {
    return null;
  }

  if (kind !== "blog" && kind !== "landing" && kind !== "faq" && kind !== "location") {
    return null;
  }

  return {
    path,
    topic,
    primaryKeyword,
    language,
    kind,
    valueScore: safeNumber(row.valueScore, 0.5),
    trafficDelta: safeNumber(row.trafficDelta, 0),
    citationTrend: safeNumber(row.citationTrend, 0),
    lastUpdatedAt: safeNumber(row.lastUpdatedAt, now() - 100 * 24 * 60 * 60 * 1000)
  };
}

function toDeliveryRequest(value: unknown): DeliveryRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  const country = cleanString(row.country);
  const path = cleanString(row.path);

  if (!country || !path) {
    return null;
  }

  const acceptedLanguages = Array.isArray(row.acceptedLanguages)
    ? row.acceptedLanguages.map((entry) => cleanString(entry)).filter((entry): entry is string => Boolean(entry))
    : ["en"];

  return {
    country,
    path,
    acceptedLanguages
  };
}

export class HttpDiscoveryFeeds implements DiscoveryFeeds {
  private readonly timeoutMs: number;
  private readonly endpoints: {
    trendsUrl?: string;
    csiEventsUrl?: string;
    programmaticUrl?: string;
    performanceUrl?: string;
    refreshUrl?: string;
    deliveryUrl?: string;
  };

  constructor(endpoints: HttpDiscoveryFeeds["endpoints"], timeoutMs = 8000) {
    this.endpoints = endpoints;
    this.timeoutMs = timeoutMs;
  }

  private async fetchJson<T>(url: string | undefined, fallback: T): Promise<T> {
    if (!url) {
      return fallback;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
        signal: controller.signal,
        cache: "no-store"
      });

      if (!response.ok) {
        return fallback;
      }

      return (await response.json()) as T;
    } catch {
      return fallback;
    } finally {
      clearTimeout(timer);
    }
  }

  async loadSearchTrendSignals(): Promise<KeywordSignal[]> {
    const payload = await this.fetchJson<unknown[]>(this.endpoints.trendsUrl, []);
    const parsed = payload.map(toKeywordSignal).filter((entry): entry is KeywordSignal => Boolean(entry));

    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        keyword: "digital services platform",
        region: "US",
        language: "en",
        source: "search-trend",
        volume: 190,
        momentum: 0.52,
        difficulty: 0.48,
        timestamp: now()
      }
    ];
  }

  async loadCSIEvents(): Promise<CSIEvent[]> {
    const payload = await this.fetchJson<unknown[]>(this.endpoints.csiEventsUrl, []);
    const parsed = payload.map(toCSIEvent).filter((entry): entry is CSIEvent => Boolean(entry));

    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        subsystem: "marketing",
        eventType: "search.query.trending",
        region: "US",
        timestamp: now(),
        metrics: {
          query: "digital services platform",
          queryCount: 160,
          trendDelta: 0.55,
          language: "en"
        },
        riskScore: 18,
        performanceScore: 86
      }
    ];
  }

  async loadProgrammaticInput(): Promise<ProgrammaticSEOInput> {
    const fallback: ProgrammaticSEOInput = {
      services: ["digital services", "seo optimization", "ai visibility strategy"],
      cities: [
        {
          city: "New York",
          country: "US",
          language: "en",
          demandScore: 0.86,
          searchTheme: "digital services platform",
          notableEntity: "New York"
        },
        {
          city: "Nairobi",
          country: "KE",
          language: "en",
          demandScore: 0.82,
          searchTheme: "digital services platform",
          notableEntity: "Nairobi"
        }
      ],
      countries: [
        {
          country: "US",
          language: "en",
          demandScore: 0.9,
          searchTheme: "services in united states"
        },
        {
          country: "KE",
          language: "en",
          demandScore: 0.83,
          searchTheme: "services in kenya"
        },
        {
          country: "NG",
          language: "en",
          demandScore: 0.8,
          searchTheme: "services in nigeria"
        }
      ]
    };

    const payload = await this.fetchJson<ProgrammaticSEOInput | null>(this.endpoints.programmaticUrl, null);
    if (!payload || !Array.isArray(payload.services) || !Array.isArray(payload.cities) || !Array.isArray(payload.countries)) {
      return fallback;
    }

    return payload;
  }

  async loadPerformanceSignals(): Promise<PagePerformanceSignal[]> {
    const payload = await this.fetchJson<unknown[]>(this.endpoints.performanceUrl, []);
    const parsed = payload.map(toPerformanceSignal).filter((entry): entry is PagePerformanceSignal => Boolean(entry));

    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        path: "/services-in-us",
        title: "Services in United States | Pulsco",
        metaDescription: "Discover services in the United States",
        h1: "Services in United States",
        targetKeyword: "services in united states",
        averagePosition: 18,
        positionDelta: -3,
        trafficDelta: -0.22,
        ctr: 0.021
      }
    ];
  }

  async loadRefreshCandidates(): Promise<RefreshCandidate[]> {
    const payload = await this.fetchJson<unknown[]>(this.endpoints.refreshUrl, []);
    const parsed = payload.map(toRefreshCandidate).filter((entry): entry is RefreshCandidate => Boolean(entry));

    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        path: "/services-in-us",
        topic: "Services in United States",
        primaryKeyword: "services in united states",
        language: "en",
        kind: "landing",
        valueScore: 0.9,
        trafficDelta: -0.21,
        citationTrend: -0.14,
        lastUpdatedAt: now() - 100 * 24 * 60 * 60 * 1000
      }
    ];
  }

  async loadDeliveryRequests(): Promise<DeliveryRequest[]> {
    const payload = await this.fetchJson<unknown[]>(this.endpoints.deliveryUrl, []);
    const parsed = payload.map(toDeliveryRequest).filter((entry): entry is DeliveryRequest => Boolean(entry));

    if (parsed.length > 0) {
      return parsed;
    }

    return [
      {
        country: "US",
        path: "/services-in-us",
        acceptedLanguages: ["en-US", "es"]
      },
      {
        country: "KE",
        path: "/services-in-ke",
        acceptedLanguages: ["en-KE", "sw"]
      }
    ];
  }
}
