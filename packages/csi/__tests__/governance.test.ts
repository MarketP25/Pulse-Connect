import { createCSIEvent } from "../events";
import { CSIGovernanceEngine } from "../governance";
import { CSISimulationEnvironment } from "../simulate";
import { CSIIntelligenceVault, InMemorySecureDatabaseAdapter } from "../vault";

describe("CSI governance workflow", () => {
  const context = {
    actorId: "governance-admin",
    actorRole: "superadmin",
    pc365Attestation: "pc365_attestation_token_123",
  };

  const historicalEvents = [
    createCSIEvent({
      subsystem: "billing",
      eventType: "invoice.failed",
      region: "US",
      metrics: { errorRate: 0.3, latencyMs: 1800, failureCount: 4 },
      riskScore: 74,
      performanceScore: 38,
    }),
  ];

  it("auto-approves Level1 proposals", async () => {
    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
    const engine = new CSIGovernanceEngine(vault, new CSISimulationEnvironment(vault));

    const decision = await engine.evaluateProposal(
      {
        title: "Minor cache tuning",
        subsystem: "communication",
        description: "Adjust cache ttl in guardrails",
        requestedBy: "ops-1",
        requestedByRole: "business-ops",
        estimatedRisk: 20,
        guardrailsCompliant: true,
        strategic: false,
      },
      context,
    );

    expect(decision.level).toBe("Level1");
    expect(decision.status).toBe("approved");
  });

  it("escalates strategic proposals to Level3 with founder/superadmin approval requirement", async () => {
    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
    const engine = new CSIGovernanceEngine(vault, new CSISimulationEnvironment(vault));

    const decision = await engine.evaluateProposal(
      {
        title: "Global billing strategy update",
        subsystem: "billing",
        description: "Strategic settlement pipeline update",
        requestedBy: "ops-2",
        requestedByRole: "coo",
        estimatedRisk: 82,
        guardrailsCompliant: false,
        strategic: true,
      },
      context,
      {
        runSimulation: true,
        historicalEvents,
      },
    );

    expect(decision.level).toBe("Level3");
    expect(decision.status).toBe("pending-founder-approval");
    expect(decision.simulationReport).toBeDefined();

    await expect(
      engine.approveStrategicDecision(
        decision.id,
        {
          approverId: "admin-unauthorized",
          approverRole: "business-ops",
          founderApproval: false,
        },
        context,
      ),
    ).rejects.toThrow("Founder or superadmin approval is required");

    const approved = await engine.approveStrategicDecision(
      decision.id,
      {
        approverId: "superadmin-1",
        approverRole: "superadmin",
        founderApproval: true,
      },
      context,
    );

    expect(approved.status).toBe("approved");
    expect(approved.approvedBy).toBe("superadmin-1");
  });
});
