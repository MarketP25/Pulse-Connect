import { CSIEvent } from "../events";

export interface SubsystemScore {
  subsystem: string;
  trustScore: number;
  performanceScore: number;
  eventVolume: number;
  lastUpdated: number;
}

export interface GlobalScoreSummary {
  globalTrustScore: number;
  globalPerformanceScore: number;
  subsystemScores: SubsystemScore[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function numberMetric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return undefined;
}

export function computeEventTrustScore(event: CSIEvent): number {
  let score = 80;

  if (event.riskScore !== undefined) {
    score -= event.riskScore * 0.55;
  }

  if (event.performanceScore !== undefined) {
    score += (event.performanceScore - 50) * 0.18;
  }

  const errorRate = numberMetric(event.metrics.errorRate);
  if (errorRate !== undefined) {
    score -= errorRate * 80;
  }

  const rejectionRate = numberMetric(event.metrics.rejectionRate);
  if (rejectionRate !== undefined) {
    score -= rejectionRate * 60;
  }

  const anomalyCount = numberMetric(event.metrics.anomalyCount);
  if (anomalyCount !== undefined) {
    score -= Math.min(25, anomalyCount * 4);
  }

  return Number(clamp(score, 0, 100).toFixed(2));
}

export function computeEventPerformanceScore(event: CSIEvent): number {
  let score = event.performanceScore ?? 60;

  const latencyMs = numberMetric(event.metrics.latencyMs);
  if (latencyMs !== undefined) {
    score -= Math.min(30, latencyMs / 120);
  }

  const throughput = numberMetric(event.metrics.throughput);
  if (throughput !== undefined) {
    score += Math.min(20, throughput / 120);
  }

  const successRate = numberMetric(event.metrics.successRate);
  if (successRate !== undefined) {
    score += (successRate - 0.5) * 35;
  }

  if (event.riskScore !== undefined) {
    score -= event.riskScore * 0.22;
  }

  return Number(clamp(score, 0, 100).toFixed(2));
}

export function computeSubsystemScores(events: CSIEvent[]): SubsystemScore[] {
  const grouped = new Map<string, CSIEvent[]>();
  for (const event of events) {
    const bucket = grouped.get(event.subsystem) ?? [];
    bucket.push(event);
    grouped.set(event.subsystem, bucket);
  }

  const scores: SubsystemScore[] = [];
  for (const [subsystem, bucket] of grouped.entries()) {
    const trustTotal = bucket.reduce((sum, event) => sum + computeEventTrustScore(event), 0);
    const performanceTotal = bucket.reduce((sum, event) => sum + computeEventPerformanceScore(event), 0);
    const lastUpdated = Math.max(...bucket.map((event) => event.timestamp));

    scores.push({
      subsystem,
      trustScore: Number((trustTotal / bucket.length).toFixed(2)),
      performanceScore: Number((performanceTotal / bucket.length).toFixed(2)),
      eventVolume: bucket.length,
      lastUpdated,
    });
  }

  return scores.sort((a, b) => b.eventVolume - a.eventVolume);
}

export function computeGlobalScores(subsystemScores: SubsystemScore[]): GlobalScoreSummary {
  if (subsystemScores.length === 0) {
    return {
      globalTrustScore: 0,
      globalPerformanceScore: 0,
      subsystemScores: [],
    };
  }

  const trustTotal = subsystemScores.reduce((sum, score) => sum + score.trustScore, 0);
  const performanceTotal = subsystemScores.reduce((sum, score) => sum + score.performanceScore, 0);

  return {
    globalTrustScore: Number((trustTotal / subsystemScores.length).toFixed(2)),
    globalPerformanceScore: Number((performanceTotal / subsystemScores.length).toFixed(2)),
    subsystemScores,
  };
}

export class CSIScoringEngine {
  score(events: CSIEvent[]): GlobalScoreSummary {
    const subsystemScores = computeSubsystemScores(events);
    return computeGlobalScores(subsystemScores);
  }
}
