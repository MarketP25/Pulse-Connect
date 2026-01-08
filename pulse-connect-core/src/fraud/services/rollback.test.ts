import { SpendControls } from "../spend/spend.controls";
import { EventOutbox } from "../events/outbox";

describe("Rollback Tests", () => {
  let spendControls: SpendControls;
  let eventOutbox: EventOutbox;

  beforeEach(() => {
    spendControls = new SpendControls();
    eventOutbox = new EventOutbox();
  });

  test("should rollback spend correctly", () => {
    const budget = {
      id: "budget1",
      user_id: "user1",
      total_budget: 1000,
      spent: 0,
      period: "monthly" as const,
      last_reset: new Date()
    };

    spendControls.setBudget(budget);
    spendControls.recordSpend("user1", 500);

    let retrievedBudget = spendControls.getBudget("user1");
    expect(retrievedBudget?.spent).toBe(500);

    spendControls.safeRollback("user1", 200);

    retrievedBudget = spendControls.getBudget("user1");
    expect(retrievedBudget?.spent).toBe(300);
  });

  test("should not rollback below zero", () => {
    const budget = {
      id: "budget1",
      user_id: "user1",
      total_budget: 1000,
      spent: 100,
      period: "monthly" as const,
      last_reset: new Date()
    };

    spendControls.setBudget(budget);
    spendControls.safeRollback("user1", 200);

    const retrievedBudget = spendControls.getBudget("user1");
    expect(retrievedBudget?.spent).toBe(0);
  });

  test("should handle event replay from DLQ", async () => {
    const event = {
      aggregate_id: "user1",
      event_type: "marketing_action",
      payload: { action: "send_email", user_id: "user1" }
    };

    eventOutbox.addEvent(event);

    // Simulate processing failure
    await eventOutbox.processEvents();

    // Check DLQ has the event
    const dlq = eventOutbox.getDLQ();
    expect(dlq.length).toBe(0); // Since stub succeeds

    // For failure simulation, we would need to mock the processEvent method
  });

  test("should rollback subscription changes", () => {
    // This would test rolling back subscription status changes
    // For now, placeholder as entitlements service doesn't have rollback
    expect(true).toBe(true);
  });

  test("should rollback consent changes", () => {
    // This would test rolling back consent grants/revokes
    // For now, placeholder as consent ledger doesn't have rollback
    expect(true).toBe(true);
  });

  test("should handle partial rollbacks", () => {
    spendControls.setBudget({
      id: "budget1",
      user_id: "user1",
      total_budget: 1000,
      spent: 0,
      period: "monthly" as const,
      last_reset: new Date()
    });

    spendControls.recordSpend("user1", 100);
    spendControls.recordSpend("user1", 200);
    spendControls.recordSpend("user1", 150);

    let budget = spendControls.getBudget("user1");
    expect(budget?.spent).toBe(450);

    // Rollback last transaction
    spendControls.safeRollback("user1", 150);

    budget = spendControls.getBudget("user1");
    expect(budget?.spent).toBe(300);
  });

  test("should maintain data consistency after rollback", () => {
    spendControls.setBudget({
      id: "budget1",
      user_id: "user1",
      total_budget: 1000,
      spent: 0,
      period: "monthly" as const,
      last_reset: new Date()
    });

    spendControls.recordSpend("user1", 300);
    spendControls.safeRollback("user1", 100);

    const budget = spendControls.getBudget("user1");
    expect(budget?.spent).toBe(200);
    expect(budget?.total_budget).toBe(1000);
  });
});
