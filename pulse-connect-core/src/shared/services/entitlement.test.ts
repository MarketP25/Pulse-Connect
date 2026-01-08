import { EntitlementsService } from "../entitlements/entitlements.service";

describe("Entitlement Tests", () => {
  let service: EntitlementsService;

  beforeEach(() => {
    service = new EntitlementsService();
  });

  test("should create base subscription", () => {
    const sub = {
      id: "base1",
      user_id: "user1",
      plan: "premium",
      status: "active" as const,
      created_at: new Date()
    };

    service.createBaseSubscription(sub);
    // Test by checking PAP subscription creation
  });

  test("should create PAP subscription", () => {
    const baseSub = {
      id: "base1",
      user_id: "user1",
      plan: "premium",
      status: "active" as const,
      created_at: new Date()
    };

    const papSub = {
      id: "pap1",
      user_id: "user1",
      base_subscription_id: "base1",
      status: "active" as const,
      created_at: new Date()
    };

    service.createBaseSubscription(baseSub);
    service.createPAPSubscription(papSub);

    const result = service.checkGating("user1", "send_email");
    expect(result.allowed).toBe(false); // No entitlement added yet
  });

  test("should check gating rules", () => {
    const baseSub = {
      id: "base1",
      user_id: "user1",
      plan: "premium",
      status: "active" as const,
      created_at: new Date()
    };

    const papSub = {
      id: "pap1",
      user_id: "user1",
      base_subscription_id: "base1",
      status: "active" as const,
      created_at: new Date()
    };

    const entitlement = {
      id: "ent1",
      subscription_pap_id: "pap1",
      entitlement: "send_email",
      limit: 100,
      used: 0
    };

    service.createBaseSubscription(baseSub);
    service.createPAPSubscription(papSub);
    service.addEntitlement(entitlement);

    const result = service.checkGating("user1", "send_email");
    expect(result.allowed).toBe(true);
  });

  test("should deny when cap exceeded", () => {
    const baseSub = {
      id: "base1",
      user_id: "user1",
      plan: "premium",
      status: "active" as const,
      created_at: new Date()
    };

    const papSub = {
      id: "pap1",
      user_id: "user1",
      base_subscription_id: "base1",
      status: "active" as const,
      created_at: new Date()
    };

    const entitlement = {
      id: "ent1",
      subscription_pap_id: "pap1",
      entitlement: "send_email",
      limit: 10,
      used: 10
    };

    service.createBaseSubscription(baseSub);
    service.createPAPSubscription(papSub);
    service.addEntitlement(entitlement);

    const result = service.checkGating("user1", "send_email");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Cap exceeded");
  });

  test("should record usage", () => {
    const baseSub = {
      id: "base1",
      user_id: "user1",
      plan: "premium",
      status: "active" as const,
      created_at: new Date()
    };

    const papSub = {
      id: "pap1",
      user_id: "user1",
      base_subscription_id: "base1",
      status: "active" as const,
      created_at: new Date()
    };

    const entitlement = {
      id: "ent1",
      subscription_pap_id: "pap1",
      entitlement: "send_email",
      limit: 100,
      used: 0
    };

    service.createBaseSubscription(baseSub);
    service.createPAPSubscription(papSub);
    service.addEntitlement(entitlement);

    service.recordUsage("pap1", "send_email", 5);
    const usage = service.getUsage("pap1");
    expect(usage.length).toBe(1);
    expect(usage[0].action).toBe("send_email");
    expect(usage[0].cost).toBe(5);
  });
});
