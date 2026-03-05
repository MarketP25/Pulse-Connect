import { CSIEvent } from "../events";

export interface DetectedPattern {
  id: string;
  subsystem: string;
  eventType: string;
  frequency: number;
  trend: "rising" | "stable" | "falling";
  confidence: number;
  supportingMetrics: Record<string, number>;
}

export interface RiskSignal {
  subsystem: string;
  eventType: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  reason: string;
  timestamp: number;
}

export interface AnalysisResult {
  patterns: DetectedPattern[];
  riskSignals: RiskSignal[];
  riskMap: Record<string, number>;
  summary: {
    totalEvents: number;
    highRiskSignals: number;
    analyzedAt: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

function toSeverity(score: number): RiskSignal["severity"] {
  if (score >= 85) {
    return "critical";
  }

  if (score >= 70) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

export function detectPatterns(events: CSIEvent[]): DetectedPattern[] {
  if (events.length === 0) {
    return [];
  }

  const grouped = new Map<string, CSIEvent[]>();
  for (const event of events) {
    const key = `${event.subsystem}::${event.eventType}`;
    const bucket = grouped.get(key) ?? [];
    bucket.push(event);
    grouped.set(key, bucket);
  }

  const patterns: DetectedPattern[] = [];
  for (const [key, bucket] of grouped.entries()) {
    const [subsystem, eventType] = key.split("::");
    const sorted = [...bucket].sort((a, b) => a.timestamp - b.timestamp);
    const midpoint = Math.max(1, Math.floor(sorted.length / 2));
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    let trend: DetectedPattern["trend"] = "stable";
    if (secondHalf.length > firstHalf.length) {
      trend = "rising";
    } else if (secondHalf.length < firstHalf.length) {
      trend = "falling";
    }

    const frequency = bucket.length / events.length;
    const avgLatency =
      bucket.reduce((sum, event) => sum + (toNumber(event.metrics.latencyMs) ?? 0), 0) / bucket.length;
    const avgErrorRate =
      bucket.reduce((sum, event) => sum + (toNumber(event.metrics.errorRate) ?? 0), 0) / bucket.length;

    patterns.push({
      id: `pattern_${subsystem}_${eventType}`,
      subsystem,
      eventType,
      frequency: Number(frequency.toFixed(4)),
      trend,
      confidence: clamp(0.4 + frequency + (trend === "stable" ? 0.05 : 0.15), 0, 0.99),
      supportingMetrics: {
        averageLatencyMs: Number(avgLatency.toFixed(2)),
        averageErrorRate: Number(avgErrorRate.toFixed(4)),
      },
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

export function detectRiskSignals(events: CSIEvent[]): RiskSignal[] {
  const signals: RiskSignal[] = [];

  for (const event of events) {
    const reasons: string[] = [];
    let score = event.riskScore ?? 0;

    const errorRate = toNumber(event.metrics.errorRate);
    if (errorRate !== undefined) {
      score += errorRate * 50;
      if (errorRate > 0.1) {
        reasons.push(`elevated errorRate=${errorRate.toFixed(3)}`);
      }
    }

    const failureCount = toNumber(event.metrics.failureCount);
    if (failureCount !== undefined) {
      score += Math.min(25, failureCount * 2);
      if (failureCount > 0) {
        reasons.push(`failures=${failureCount}`);
      }
    }

    const latencyMs = toNumber(event.metrics.latencyMs);
    if (latencyMs !== undefined && latencyMs > 1500) {
      score += Math.min(20, latencyMs / 500);
      reasons.push(`high latency=${latencyMs}ms`);
    }

    if (event.performanceScore !== undefined && event.performanceScore < 45) {
      score += (45 - event.performanceScore) * 0.7;
      reasons.push(`low performanceScore=${event.performanceScore}`);
    }

    const clamped = clamp(score, 0, 100);
    if (clamped < 35) {
      continue;
    }

    signals.push({
      subsystem: event.subsystem,
      eventType: event.eventType,
      severity: toSeverity(clamped),
      score: Number(clamped.toFixed(2)),
      reason: reasons.join(", ") || "risk signal from model baseline",
      timestamp: event.timestamp,
    });
  }

  return signals.sort((a, b) => b.score - a.score);
}

export function buildRiskMap(signals: RiskSignal[]): Record<string, number> {
  const riskMap: Record<string, number> = {};

  for (const signal of signals) {
    const current = riskMap[signal.subsystem] ?? 0;
    if (signal.score > current) {
      riskMap[signal.subsystem] = signal.score;
    }
  }

  return riskMap;
}

export function analyzeEvents(events: CSIEvent[]): AnalysisResult {
  const patterns = detectPatterns(events);
  const riskSignals = detectRiskSignals(events);
  const riskMap = buildRiskMap(riskSignals);

  return {
    patterns,
    riskSignals,
    riskMap,
    summary: {
      totalEvents: events.length,
      highRiskSignals: riskSignals.filter((signal) => signal.severity === "high" || signal.severity === "critical")
        .length,
      analyzedAt: Date.now(),
    },
  };
}

export class CSIAnalysisEngine {
  private readonly maxWindowSize: number;
  private window: CSIEvent[] = [];

  constructor(maxWindowSize = 1000) {
    this.maxWindowSize = maxWindowSize;
  }

  ingestEvent(event: CSIEvent): void {
    this.window.push(event);
    if (this.window.length > this.maxWindowSize) {
      this.window.shift();
    }
  }

  analyzeCurrentWindow(): AnalysisResult {
    return analyzeEvents(this.window);
  }

  analyzeBatch(events: CSIEvent[]): AnalysisResult {
    for (const event of events) {
      this.ingestEvent(event);
    }

    return this.analyzeCurrentWindow();
  }

  getWindowSnapshot(): CSIEvent[] {
    return [...this.window];
  }

  reset(): void {
    this.window = [];
  }
}
