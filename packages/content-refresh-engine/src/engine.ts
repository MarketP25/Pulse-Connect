import { ASEOContentEngine } from "@pulsco/aseo-content-engine";
import { RefreshCandidate, RefreshExecution, RefreshPlanItem } from "./types";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function daysSince(timestamp: number, now: number): number {
  return (now - timestamp) / (24 * 60 * 60 * 1000);
}

function calculatePriority(candidate: RefreshCandidate, now: number): { score: number; reason: string } {
  const ageDays = daysSince(candidate.lastUpdatedAt, now);
  let score = 0;
  const reasons: string[] = [];

  if (ageDays >= 90) {
    score += 45;
    reasons.push("older than 90 days");
  }

  if (candidate.trafficDelta <= -0.15) {
    score += 25;
    reasons.push("traffic decline detected");
  }

  if (candidate.citationTrend <= -0.1) {
    score += 20;
    reasons.push("AI citation decline detected");
  }

  if (candidate.valueScore >= 0.75) {
    score += 20;
    reasons.push("high-value page");
  }

  return {
    score: Number(score.toFixed(2)),
    reason: reasons.join(", ") || "routine refresh cycle"
  };
}

export class ContentRefreshEngine {
  private readonly contentEngine: ASEOContentEngine;

  constructor(contentEngine = new ASEOContentEngine()) {
    this.contentEngine = contentEngine;
  }

  plan(candidates: RefreshCandidate[], now = Date.now()): RefreshPlanItem[] {
    const plan: RefreshPlanItem[] = [];

    for (const candidate of candidates) {
      const { score, reason } = calculatePriority(candidate, now);
      const ageMs = now - candidate.lastUpdatedAt;
      const isDue = ageMs >= NINETY_DAYS_MS || score >= 40;

      if (!isDue) {
        continue;
      }

      plan.push({
        path: candidate.path,
        priorityScore: score,
        reason,
        refreshBy: now + 7 * 24 * 60 * 60 * 1000,
        request: {
          kind: candidate.kind,
          topic: candidate.topic,
          primaryKeyword: candidate.primaryKeyword,
          language: candidate.language,
          entities: ["Pulsco", candidate.primaryKeyword],
          questions: [
            `What changed in ${candidate.primaryKeyword} demand this quarter`,
            `How does Pulsco keep ${candidate.primaryKeyword} content current`,
            `Which updates improve AI citation quality for ${candidate.primaryKeyword}`
          ]
        }
      });
    }

    return plan.sort((left, right) => right.priorityScore - left.priorityScore);
  }

  execute(candidates: RefreshCandidate[], now = Date.now()): RefreshExecution {
    const plan = this.plan(candidates, now);
    const refreshedAssets = plan.map((item) => this.contentEngine.generate(item.request));

    return {
      plan,
      refreshedAssets
    };
  }
}
