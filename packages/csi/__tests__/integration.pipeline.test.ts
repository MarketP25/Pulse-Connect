import { clearCSIEventHistory, createCSIEvent, emitCSIEvent } from "../events";
import { analyzeEvents } from "../engine/analysis";
import { CSIIngestionEngine } from "../engine/ingestion";
import { generateRecommendations } from "../engine/recommendations";
import { computeSubsystemScores } from "../engine/scoring";
import { CSIIntelligenceVault, InMemorySecureDatabaseAdapter } from "../vault";

describe("CSI integration pipeline", () => {
  beforeEach(() => {
    clearCSIEventHistory();
  });

  it("ingests events and stores aggregated intelligence in VAULT", async () => {
    const ingestedEvents: ReturnType<typeof createCSIEvent>[] = [];
    const ingestion = new CSIIngestionEngine(async (event) => {
      ingestedEvents.push(event);
    });

    ingestion.startIngestion();

    emitCSIEvent(
      createCSIEvent({
        subsystem: "ecommerce",
        eventType: "order.created",
        region: "US",
        metrics: { latencyMs: 240, successRate: 0.98, throughput: 140 },
        riskScore: 18,
        performanceScore: 89,
      }),
    );

    emitCSIEvent(
      createCSIEvent({
        subsystem: "billing",
        eventType: "invoice.failed",
        region: "US",
        metrics: { latencyMs: 2100, errorRate: 0.31, failureCount: 3 },
        riskScore: 76,
        performanceScore: 35,
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 15));
    ingestion.stopIngestion();

    const analysis = analyzeEvents(ingestedEvents);
    const scores = computeSubsystemScores(ingestedEvents);
    const recommendations = generateRecommendations({ analysis, scores });

    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
    await vault.storeAggregatedIntelligence(
      {
        summary: analysis.summary,
        riskMap: analysis.riskMap,
        recommendations,
      },
      {
        actorId: "superadmin-1",
        actorRole: "superadmin",
        pc365Attestation: "pc365_attestation_token_123",
      },
    );

    const latest = await vault.getLatestIntelligenceSummary({
      actorId: "superadmin-1",
      actorRole: "superadmin",
      pc365Attestation: "pc365_attestation_token_123",
    });

    expect(analysis.summary.totalEvents).toBe(2);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(latest?.riskMap?.billing).toBeGreaterThan(60);
  });
});
