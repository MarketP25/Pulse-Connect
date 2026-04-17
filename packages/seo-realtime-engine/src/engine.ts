import { PagePerformanceSignal, SEOAdjustment, TriggerSignal } from "./types";

function severity(score: number): SEOAdjustment["severity"] {
  if (score >= 7) {
    return "high";
  }

  if (score >= 4) {
    return "medium";
  }

  return "low";
}

function trimSentence(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

export class SEORealtimeAdjustmentEngine {
  buildAdjustments(
    pages: PagePerformanceSignal[],
    triggerSignals: TriggerSignal[] = []
  ): SEOAdjustment[] {
    const now = Date.now();
    const year = new Date(now).getUTCFullYear();

    return pages
      .map((page) => {
        const reasons: string[] = [];
        const update: SEOAdjustment = {
          path: page.path,
          reasons,
          severity: "low",
          generatedAt: now
        };

        let severityScore = 0;

        if (page.positionDelta <= -3 || page.averagePosition > 18) {
          reasons.push("Ranking drop detected");
          update.title = trimSentence(
            `${page.targetKeyword} in ${year} | Pulsco Answer-First Services`,
            62
          );
          severityScore += 4;
        }

        if (page.trafficDelta <= -0.2 || page.ctr < 0.025) {
          reasons.push("Traffic/CTR decline detected");
          update.metaDescription = trimSentence(
            `Direct answers for ${page.targetKeyword}. Structured content, local relevance, and schema designed for AI citations.`,
            155
          );
          severityScore += 3;
        }

        const matchedTrigger = triggerSignals.find((trigger) =>
          trigger.query.toLowerCase().includes(page.targetKeyword.toLowerCase())
        );

        if (matchedTrigger) {
          reasons.push(`CSI demand trend in ${matchedTrigger.region}`);
          update.h1 = `How Pulsco Delivers ${page.targetKeyword} for ${matchedTrigger.region}`;
          severityScore += matchedTrigger.urgency === "high" ? 4 : matchedTrigger.urgency === "medium" ? 2 : 1;
        }

        if (!update.title && !update.metaDescription && !update.h1) {
          return null;
        }

        update.severity = severity(severityScore);
        return update;
      })
      .filter((adjustment): adjustment is SEOAdjustment => Boolean(adjustment));
  }
}
