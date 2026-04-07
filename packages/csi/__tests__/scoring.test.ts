import { createCSIEvent } from "../events";
import {
  computeEventPerformanceScore,
  computeEventTrustScore,
  computeGlobalScores,
  computeSubsystemScores
} from "../engine/scoring";

describe("CSI scoring", () => {
  const stableEvent = createCSIEvent({
    subsystem: "places",
    eventType: "place.viewed",
    region: "US",
    metrics: { latencyMs: 120, successRate: 0.99, throughput: 500 },
    riskScore: 10,
    performanceScore: 90
  });

  const unstableEvent = createCSIEvent({
    subsystem: "places",
    eventType: "reservation.failed",
    region: "US",
    metrics: { latencyMs: 2300, errorRate: 0.4, rejectionRate: 0.2 },
    riskScore: 82,
    performanceScore: 24
  });

  it("computes event-level trust/performance scores", () => {
    const stableTrust = computeEventTrustScore(stableEvent);
    const unstableTrust = computeEventTrustScore(unstableEvent);

    const stablePerf = computeEventPerformanceScore(stableEvent);
    const unstablePerf = computeEventPerformanceScore(unstableEvent);

    expect(stableTrust).toBeGreaterThan(unstableTrust);
    expect(stablePerf).toBeGreaterThan(unstablePerf);
  });

  it("aggregates scores at subsystem and global level", () => {
    const subsystemScores = computeSubsystemScores([stableEvent, unstableEvent]);
    const global = computeGlobalScores(subsystemScores);

    expect(subsystemScores).toHaveLength(1);
    expect(global.globalTrustScore).toBeGreaterThanOrEqual(0);
    expect(global.globalTrustScore).toBeLessThanOrEqual(100);
  });
});
