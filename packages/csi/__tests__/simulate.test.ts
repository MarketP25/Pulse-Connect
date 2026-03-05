import { createCSIEvent } from "../events";
import { CSISimulationEnvironment, simulateChangeAgainstHistory } from "../simulate";
import { CSIIntelligenceVault, InMemorySecureDatabaseAdapter } from "../vault";

describe("CSI simulation", () => {
  const events = [
    createCSIEvent({
      subsystem: "ecommerce",
      eventType: "order.created",
      region: "US",
      metrics: { latencyMs: 800, successRate: 0.95, throughput: 130 },
      riskScore: 40,
      performanceScore: 55,
    }),
    createCSIEvent({
      subsystem: "ecommerce",
      eventType: "order.paid",
      region: "US",
      metrics: { latencyMs: 600, successRate: 0.97, throughput: 150 },
      riskScore: 35,
      performanceScore: 62,
    }),
  ];

  it("produces predicted outcomes against historical data", () => {
    const report = simulateChangeAgainstHistory(
      {
        title: "Tune checkout latency",
        subsystem: "ecommerce",
        description: "Adjust queue and retry settings",
        expectedMetricDelta: { latencyMs: -200 },
        riskAdjustment: -6,
        performanceAdjustment: 8,
      },
      events,
    );

    expect(report.proposal.subsystem).toBe("ecommerce");
    expect(report.outcome).toMatch(/improve|neutral|regress/);
    expect(typeof report.deltas.performanceDelta).toBe("number");
  });

  it("persists simulation reports into VAULT", async () => {
    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
    const simulation = new CSISimulationEnvironment(vault);

    const result = await simulation.runAndPersist(
      {
        title: "Tune ecommerce throughput",
        subsystem: "ecommerce",
        description: "Scale workers",
        expectedMetricDelta: { throughput: 20 },
      },
      events,
      {
        actorId: "superadmin-1",
        actorRole: "superadmin",
        pc365Attestation: "pc365_attestation_token_123",
      },
    );

    expect(result.report.id).toBeDefined();
    expect(result.vaultRecord?.id).toBeDefined();
  });
});
