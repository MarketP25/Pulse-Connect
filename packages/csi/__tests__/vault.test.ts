import { CSIIntelligenceVault, InMemorySecureDatabaseAdapter, VaultAuthContext } from "../vault";

describe("CSI VAULT", () => {
  const validContext: VaultAuthContext = {
    actorId: "admin-1",
    actorRole: "superadmin",
    pc365Attestation: "pc365_attestation_token_123",
    requestId: "req-1"
  };

  it("stores and reads records with PC365-authenticated context", async () => {
    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());

    const inserted = await vault.storeAggregatedIntelligence(
      { summary: { health: "stable" }, source: "analysis" },
      validContext
    );

    expect(inserted.id).toBeDefined();

    const latest = await vault.getLatestIntelligenceSummary(validContext);
    expect(latest?.summary.health).toBe("stable");

    const logs = await vault.listAuditLogs(validContext);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((entry) => entry.pc365Verified)).toBe(true);
  });

  it("blocks unauthenticated VAULT access", async () => {
    const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());

    await expect(
      vault.storePatternModel(
        { modelName: "pattern-1", version: "v1" },
        {
          actorId: "admin-2",
          actorRole: "coo",
          pc365Attestation: ""
        }
      )
    ).rejects.toThrow("PC365 authentication required");
  });
});
