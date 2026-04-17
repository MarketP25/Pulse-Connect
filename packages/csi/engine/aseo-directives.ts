import { CSIEvent } from "../events";

export type CSIDirectivePriority = "low" | "medium" | "high" | "critical";
export type CSIDirectiveType =
  | "content_generation"
  | "content_refresh"
  | "metadata_adjustment"
  | "distribution_boost"
  | "linking_boost";

export interface CSISEODirective {
  id: string;
  region: string;
  query: string;
  sourceEventType: string;
  priority: CSIDirectivePriority;
  type: CSIDirectiveType;
  rationale: string;
  recommendedTemplates: Array<"location" | "landing" | "faq" | "blog">;
  confidence: number;
  createdAt: number;
}

function queryFromEvent(event: CSIEvent): string | null {
  const queryCandidates = [event.metrics.query, event.metrics.searchTerm, event.metrics.keyword];
  for (const candidate of queryCandidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

function toNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toPriority(score: number): CSIDirectivePriority {
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

function toDirectiveType(event: CSIEvent, score: number): CSIDirectiveType {
  const rankingDelta = toNumber(event.metrics.rankingDelta);
  const citationDelta = toNumber(event.metrics.citationDelta);

  if (rankingDelta !== undefined && rankingDelta <= -2) {
    return "metadata_adjustment";
  }

  if (citationDelta !== undefined && citationDelta <= -0.1) {
    return "distribution_boost";
  }

  if (score >= 75) {
    return "content_generation";
  }

  if (score >= 55) {
    return "content_refresh";
  }

  return "linking_boost";
}

function templatesFor(type: CSIDirectiveType): Array<"location" | "landing" | "faq" | "blog"> {
  switch (type) {
    case "content_generation":
      return ["location", "landing", "faq"];
    case "content_refresh":
      return ["blog", "faq"];
    case "metadata_adjustment":
      return ["landing", "faq"];
    case "distribution_boost":
      return ["blog", "landing"];
    default:
      return ["blog", "faq"];
  }
}

function scoreDirective(event: CSIEvent): number {
  let score = 40;

  const trendDelta = toNumber(event.metrics.trendDelta);
  if (trendDelta !== undefined) {
    score += Math.max(-20, Math.min(30, trendDelta * 40));
  }

  const queryCount = toNumber(event.metrics.queryCount) ?? toNumber(event.metrics.searchVolume);
  if (queryCount !== undefined) {
    score += Math.min(20, Math.log10(queryCount + 1) * 8);
  }

  if (event.riskScore !== undefined) {
    score += Math.max(0, 20 - event.riskScore * 0.25);
  }

  if (event.performanceScore !== undefined) {
    score += (event.performanceScore - 50) * 0.25;
  }

  return Math.max(0, Math.min(100, score));
}

export interface CSIDirectiveBuildOptions {
  minPriority?: CSIDirectivePriority;
  now?: number;
}

const priorityRank: Record<CSIDirectivePriority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export class CSISEODirectiveEngine {
  build(events: CSIEvent[], options: CSIDirectiveBuildOptions = {}): CSISEODirective[] {
    const now = options.now ?? Date.now();
    const directives: CSISEODirective[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      const query = queryFromEvent(event);
      if (!query) {
        continue;
      }

      const score = scoreDirective(event);
      const priority = toPriority(score);
      const type = toDirectiveType(event, score);
      const key = `${event.region.toUpperCase()}::${query}::${type}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      directives.push({
        id: `seo_dir_${event.region.toUpperCase()}_${Math.abs(
          [...query].reduce((sum, char) => sum + char.charCodeAt(0), 0)
        )}_${now}`,
        region: event.region.toUpperCase(),
        query,
        sourceEventType: event.eventType,
        priority,
        type,
        rationale: `CSI detected ${event.eventType} pattern for query \"${query}\" in ${event.region.toUpperCase()}.`,
        recommendedTemplates: templatesFor(type),
        confidence: Number((0.45 + score / 200).toFixed(4)),
        createdAt: now
      });
    }

    directives.sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);

    if (!options.minPriority) {
      return directives;
    }

    return directives.filter(
      (directive) => priorityRank[directive.priority] >= priorityRank[options.minPriority!]
    );
  }
}
