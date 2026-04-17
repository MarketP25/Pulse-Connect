import { KeywordSignal } from "@pulsco/aseo-core";
import { CSIEvent, getCSIEventHistory } from "@pulsco/csi";
import { AdapterSnapshot, ContentTrigger, RegionalDemandInsight } from "./types";

function normalizeQuery(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
}

function parseVolume(metrics: Record<string, unknown>): number {
  const candidates = [metrics.queryCount, metrics.searchVolume, metrics.requests, metrics.impressions];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 1;
}

function parseMomentum(metrics: Record<string, unknown>): number {
  const value = metrics.trendDelta;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(-1, Math.min(1, value));
  }

  return 0;
}

function urgency(score: number): ContentTrigger["urgency"] {
  if (score >= 0.8) {
    return "high";
  }

  if (score >= 0.45) {
    return "medium";
  }

  return "low";
}

export class ASEOCSIAdapter {
  private readonly events: CSIEvent[] = [];

  ingest(events: CSIEvent[]): void {
    this.events.push(...events);
  }

  pullFromCSIHistory(limit = 500): void {
    const historical = getCSIEventHistory(limit);
    this.ingest(historical);
  }

  toKeywordSignals(languageFallback = "en"): KeywordSignal[] {
    const signals: KeywordSignal[] = [];

    for (const event of this.events) {
      const query =
        normalizeQuery(event.metrics.query) ??
        normalizeQuery(event.metrics.searchTerm) ??
        normalizeQuery(event.metrics.keyword);

      if (!query) {
        continue;
      }

      const language =
        typeof event.metrics.language === "string" && event.metrics.language.trim().length > 0
          ? event.metrics.language.trim().toLowerCase()
          : languageFallback;

      signals.push({
        keyword: query,
        region: event.region,
        language,
        source: "csi-query",
        volume: parseVolume(event.metrics),
        momentum: parseMomentum(event.metrics),
        difficulty: typeof event.metrics.keywordDifficulty === "number" ? event.metrics.keywordDifficulty : undefined,
        timestamp: event.timestamp
      });
    }

    return signals;
  }

  detectRegionalDemand(): RegionalDemandInsight[] {
    const grouped = new Map<string, Array<{ query: string; volume: number }>>();

    for (const signal of this.toKeywordSignals()) {
      const key = signal.region.toUpperCase();
      const bucket = grouped.get(key) ?? [];
      bucket.push({ query: signal.keyword, volume: signal.volume });
      grouped.set(key, bucket);
    }

    const insights: RegionalDemandInsight[] = [];

    for (const [region, bucket] of grouped.entries()) {
      const queryVolume = new Map<string, number>();
      for (const item of bucket) {
        queryVolume.set(item.query, (queryVolume.get(item.query) ?? 0) + item.volume);
      }

      const sorted = [...queryVolume.entries()].sort((left, right) => right[1] - left[1]);
      const dominant = sorted[0];
      if (!dominant) {
        continue;
      }

      const totalVolume = sorted.reduce((sum, [, volume]) => sum + volume, 0);
      const score = dominant[1] / Math.max(1, totalVolume);

      insights.push({
        region,
        dominantQuery: dominant[0],
        demandScore: Number(score.toFixed(4)),
        eventCount: bucket.length
      });
    }

    return insights.sort((left, right) => right.demandScore - left.demandScore);
  }

  buildContentTriggers(): ContentTrigger[] {
    return this.detectRegionalDemand().map((insight) => ({
      region: insight.region,
      query: insight.dominantQuery,
      recommendation: `Users in ${insight.region} are searching: ${insight.dominantQuery}. Trigger localized content generation.`,
      urgency: urgency(insight.demandScore)
    }));
  }

  snapshot(): AdapterSnapshot {
    return {
      signals: this.toKeywordSignals(),
      demandInsights: this.detectRegionalDemand(),
      triggers: this.buildContentTriggers()
    };
  }
}
