import { PolicyEngine } from "../logic/policy-engine";

describe("Quiet Hours Tests", () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  test("should allow during business hours", async () => {
    // Mock current time to be 10 AM
    const mockDate = new Date();
    mockDate.setHours(10, 0, 0, 0);
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

    const result = await engine.evaluateAction("user1", "send_email", { channel: "email" });
    expect(result.allowed).toBe(true); // Default allow if no policies

    jest.restoreAllMocks();
  });

  test("should deny during quiet hours", async () => {
    // Add a policy for quiet hours
    engine.loadPolicy({
      id: "quiet_hours",
      name: "Quiet Hours Policy",
      description: "Deny actions during quiet hours",
      version: "1.0.0",
      effectiveDate: new Date(),
      status: "active",
      rules: [
        {
          id: "quiet_rule",
          condition: 'action == "send_email" && (hour >= 22 || hour <= 6)',
          action: "deny",
          priority: 10
        }
      ]
    });

    // Mock current time to be 2 AM (quiet hours)
    const mockDate = new Date();
    mockDate.setHours(2, 0, 0, 0);
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

    const result = await engine.evaluateAction("user1", "send_email", {
      channel: "email",
      hour: 2
    });
    expect(result.allowed).toBe(false);

    jest.restoreAllMocks();
  });

  test("should allow outside quiet hours", async () => {
    // Add a policy for quiet hours
    engine.loadPolicy({
      id: "quiet_hours",
      name: "Quiet Hours Policy",
      description: "Deny actions during quiet hours",
      version: "1.0.0",
      effectiveDate: new Date(),
      status: "active",
      rules: [
        {
          id: "quiet_rule",
          condition: 'action == "send_email" && (hour >= 22 || hour <= 6)',
          action: "deny",
          priority: 10
        }
      ]
    });

    // Mock current time to be 10 AM (not quiet hours)
    const mockDate = new Date();
    mockDate.setHours(10, 0, 0, 0);
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

    const result = await engine.evaluateAction("user1", "send_email", {
      channel: "email",
      hour: 10
    });
    expect(result.allowed).toBe(true);

    jest.restoreAllMocks();
  });

  test("should handle timezone differences", async () => {
    // Add a policy for quiet hours in UTC
    engine.loadPolicy({
      id: "quiet_hours",
      name: "Quiet Hours Policy",
      description: "Deny actions during quiet hours",
      version: "1.0.0",
      effectiveDate: new Date(),
      status: "active",
      rules: [
        {
          id: "quiet_rule",
          condition: 'action == "send_email" && (utc_hour >= 22 || utc_hour <= 6)',
          action: "deny",
          priority: 10
        }
      ]
    });

    // Mock current time to be 2 AM UTC (quiet hours)
    const mockDate = new Date();
    mockDate.setUTCHours(2, 0, 0, 0);
    jest.spyOn(global, "Date").mockImplementation(() => mockDate as any);

    const result = await engine.evaluateAction("user1", "send_email", {
      channel: "email",
      utc_hour: 2
    });
    expect(result.allowed).toBe(false);

    jest.restoreAllMocks();
  });
});
