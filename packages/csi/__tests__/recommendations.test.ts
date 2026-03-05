import { createCSIEvent } from "../events";
import { analyzeEvents } from "../engine/analysis";
import { generateRecommendations } from "../engine/recommendations";
import { computeSubsystemScores } from "../engine/scoring";

describe("CSI recommendations", () => {
  it("generates advisory actions from analysis and scoring", () => {
    const events = [
      createCSIEvent({
        subsystem: "billing",
        eventType: "invoice.failed",
        region: "US",
        metrics: { errorRate: 0.4, latencyMs: 2200, failureCount: 5 },
        riskScore: 80,
        performanceScore: 30,
      }),
      createCSIEvent({
        subsystem: "billing",
        eventType: "invoice.retry",
        region: "US",
        metrics: { errorRate: 0.2, latencyMs: 1300 },
        riskScore: 52,
        performanceScore: 52,
      }),
    ];

    const analysis = analyzeEvents(events);
    const scores = computeSubsystemScores(events);
    const recommendations = generateRecommendations({ analysis, scores });

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].advisoryOnly).toBe(true);
    expect(recommendations.some((item) => item.approvalLevel === "Level3")).toBe(true);
  });
});
