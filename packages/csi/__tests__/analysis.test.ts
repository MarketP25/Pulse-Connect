import { createCSIEvent } from "../events";
import { analyzeEvents, detectPatterns, detectRiskSignals } from "../engine/analysis";

describe("CSI analysis", () => {
  const events = [
    createCSIEvent({
      subsystem: "communication",
      eventType: "message.sent",
      region: "US",
      timestamp: 1,
      metrics: { latencyMs: 250, errorRate: 0.01, successRate: 0.99 },
      riskScore: 12,
      performanceScore: 88
    }),
    createCSIEvent({
      subsystem: "communication",
      eventType: "message.sent",
      region: "US",
      timestamp: 2,
      metrics: { latencyMs: 260, errorRate: 0.02, successRate: 0.98 },
      riskScore: 14,
      performanceScore: 84
    }),
    createCSIEvent({
      subsystem: "billing",
      eventType: "invoice.failed",
      region: "EU",
      timestamp: 3,
      metrics: { latencyMs: 2200, errorRate: 0.34, failureCount: 6 },
      riskScore: 72,
      performanceScore: 31
    })
  ];

  it("detects grouped patterns", () => {
    const patterns = detectPatterns(events);
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toHaveProperty("subsystem");
    expect(patterns[0]).toHaveProperty("frequency");
  });

  it("detects risk signals", () => {
    const signals = detectRiskSignals(events);
    expect(signals.length).toBeGreaterThan(0);
    expect(signals[0].severity).toMatch(/high|critical/);
  });

  it("builds a full analysis result", () => {
    const result = analyzeEvents(events);
    expect(result.summary.totalEvents).toBe(3);
    expect(result.riskMap.billing).toBeGreaterThan(60);
  });
});
