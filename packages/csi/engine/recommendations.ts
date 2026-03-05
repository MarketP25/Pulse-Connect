import { AnalysisResult } from "./analysis";
import { SubsystemScore } from "./scoring";

export type RecommendationPriority = "low" | "medium" | "high" | "critical";
export type RecommendationApprovalLevel = "Level1" | "Level2" | "Level3";

export interface CSIRecommendation {
  id: string;
  subsystem: string;
  title: string;
  rationale: string;
  action: string;
  priority: RecommendationPriority;
  approvalLevel: RecommendationApprovalLevel;
  advisoryOnly: true;
  createdAt: number;
}

export interface RecommendationInput {
  analysis: AnalysisResult;
  scores: SubsystemScore[];
}

function toPriority(score: number): RecommendationPriority {
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

function toApprovalLevel(score: number, strategic = false): RecommendationApprovalLevel {
  if (strategic || score >= 70) {
    return "Level3";
  }

  if (score >= 40) {
    return "Level2";
  }

  return "Level1";
}

function priorityRank(priority: RecommendationPriority): number {
  switch (priority) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}

export function generateRecommendations(input: RecommendationInput): CSIRecommendation[] {
  const recommendations: CSIRecommendation[] = [];
  const now = Date.now();

  for (const [subsystem, riskScore] of Object.entries(input.analysis.riskMap)) {
    const priority = toPriority(riskScore);
    recommendations.push({
      id: `risk_${subsystem}_${now}`,
      subsystem,
      title: `Risk mitigation advisory for ${subsystem}`,
      rationale: `Risk map score is ${riskScore.toFixed(2)} with active correlated signals.`,
      action: "Review anomaly clusters, tighten guardrails, and queue mitigation changes for approval.",
      priority,
      approvalLevel: toApprovalLevel(riskScore, riskScore >= 80),
      advisoryOnly: true,
      createdAt: now,
    });
  }

  for (const score of input.scores) {
    if (score.performanceScore >= 65) {
      continue;
    }

    recommendations.push({
      id: `perf_${score.subsystem}_${now}`,
      subsystem: score.subsystem,
      title: `Performance optimization advisory for ${score.subsystem}`,
      rationale: `Performance score is ${score.performanceScore.toFixed(2)} across ${score.eventVolume} events.`,
      action: "Propose targeted optimization and run simulation against historical CSI data before rollout.",
      priority: toPriority(100 - score.performanceScore),
      approvalLevel: toApprovalLevel(100 - score.performanceScore),
      advisoryOnly: true,
      createdAt: now,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: `monitor_${now}`,
      subsystem: "csi",
      title: "System operating within expected range",
      rationale: "No high-risk or low-performance clusters were found in the active analysis window.",
      action: "Continue observability and keep advisory mode active.",
      priority: "low",
      approvalLevel: "Level1",
      advisoryOnly: true,
      createdAt: now,
    });
  }

  return recommendations.sort((left, right) => {
    return priorityRank(right.priority) - priorityRank(left.priority);
  });
}

export class CSIRecommendationEngine {
  build(input: RecommendationInput): CSIRecommendation[] {
    return generateRecommendations(input);
  }
}
