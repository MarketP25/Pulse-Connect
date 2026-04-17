import { IntentCluster, KeywordInsight, KeywordSignal, SearchIntent } from "./types";

const TRANSACTIONAL_TERMS = [
  "buy",
  "price",
  "cost",
  "service",
  "quote",
  "agency",
  "near me",
  "hire",
  "platform"
];

const INFORMATIONAL_TERMS = ["how", "what", "why", "guide", "tips", "learn", "best way"];

const NAVIGATIONAL_TERMS = ["pulsco", "login", "docs", "dashboard", "pricing", "contact"];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function classifyIntent(keyword: string): SearchIntent {
  const normalized = normalize(keyword);

  if (NAVIGATIONAL_TERMS.some((term) => normalized.includes(term))) {
    return "navigational";
  }

  if (TRANSACTIONAL_TERMS.some((term) => normalized.includes(term))) {
    return "transactional";
  }

  if (INFORMATIONAL_TERMS.some((term) => normalized.includes(term))) {
    return "informational";
  }

  return "informational";
}

export function extractEntities(keyword: string): string[] {
  const terms = keyword
    .split(/[^A-Za-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  const entities = new Set<string>();
  for (const term of terms) {
    if (/^[A-Z]/.test(term)) {
      entities.add(term);
      continue;
    }

    const normalized = term.toLowerCase();
    if (["africa", "europe", "asia", "america", "kenya", "nigeria", "usa"].includes(normalized)) {
      entities.add(normalized.toUpperCase());
    }
  }

  return [...entities];
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toOpportunity(
  totalVolume: number,
  momentum: number,
  intent: SearchIntent,
  avgDifficulty: number
): number {
  const intentMultiplier: Record<SearchIntent, number> = {
    transactional: 1.25,
    informational: 1.0,
    navigational: 0.8
  };

  const volumeScore = Math.log10(totalVolume + 10) * 35;
  const momentumScore = (momentum + 1) * 12;
  const difficultyPenalty = avgDifficulty * 20;

  const score = (volumeScore + momentumScore - difficultyPenalty) * intentMultiplier[intent];
  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

export interface KeywordInsightOptions {
  region?: string;
  language?: string;
  limit?: number;
}

export class KeywordIntelligenceEngine {
  private readonly signals: KeywordSignal[] = [];

  ingestSignals(signals: KeywordSignal[]): void {
    this.signals.push(...signals);
  }

  getSignals(): KeywordSignal[] {
    return [...this.signals];
  }

  buildInsights(options: KeywordInsightOptions = {}): KeywordInsight[] {
    const filtered = this.signals.filter((signal) => {
      if (options.region && signal.region.toUpperCase() !== options.region.toUpperCase()) {
        return false;
      }

      if (options.language && signal.language.toLowerCase() !== options.language.toLowerCase()) {
        return false;
      }

      return true;
    });

    const grouped = new Map<string, KeywordSignal[]>();
    for (const signal of filtered) {
      const key = `${normalize(signal.keyword)}::${signal.region.toUpperCase()}::${signal.language.toLowerCase()}`;
      const bucket = grouped.get(key) ?? [];
      bucket.push(signal);
      grouped.set(key, bucket);
    }

    const insights: KeywordInsight[] = [];
    for (const [key, bucket] of grouped.entries()) {
      const [keyword, region, language] = key.split("::");
      const totalVolume = bucket.reduce((sum, signal) => sum + Math.max(signal.volume, 0), 0);
      const momentum = average(bucket.map((signal) => signal.momentum));
      const avgDifficulty = average(
        bucket
          .map((signal) => signal.difficulty)
          .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
      );
      const intent = classifyIntent(keyword);

      insights.push({
        keyword,
        region,
        language,
        intent,
        totalVolume,
        momentum: Number(momentum.toFixed(4)),
        opportunityScore: toOpportunity(totalVolume, momentum, intent, avgDifficulty),
        entities: extractEntities(bucket[0]?.keyword ?? keyword),
        sourceBlend: [...new Set(bucket.map((signal) => signal.source))]
      });
    }

    insights.sort((left, right) => right.opportunityScore - left.opportunityScore);

    if (!options.limit || options.limit <= 0) {
      return insights;
    }

    return insights.slice(0, options.limit);
  }

  clusterByIntent(options: KeywordInsightOptions = {}): IntentCluster[] {
    const insights = this.buildInsights(options);
    const buckets = new Map<SearchIntent, KeywordInsight[]>();

    for (const insight of insights) {
      const bucket = buckets.get(insight.intent) ?? [];
      bucket.push(insight);
      buckets.set(insight.intent, bucket);
    }

    return [...buckets.entries()].map(([intent, keywords]) => {
      const aggregateVolume = keywords.reduce((sum, keyword) => sum + keyword.totalVolume, 0);
      const avgOpportunity = average(keywords.map((keyword) => keyword.opportunityScore));

      return {
        intent,
        keywords,
        aggregateVolume,
        avgOpportunity: Number(avgOpportunity.toFixed(2))
      };
    });
  }
}
