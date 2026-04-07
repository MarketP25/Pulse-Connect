import {
  clearCSIEventHistory,
  createCSIEvent,
  createSubsystemEmitter,
  emitCSIEvent,
  getCSIEventHistory,
  subscribeToEventBus,
  validateCSIEvent
} from "../events";

describe("CSI events", () => {
  beforeEach(() => {
    clearCSIEventHistory();
  });

  it("validates and normalizes a well-formed event", () => {
    const result = validateCSIEvent({
      subsystem: "ecommerce",
      eventType: "order.created",
      region: "us",
      timestamp: Date.now(),
      metrics: { total: 1 },
      riskScore: 23,
      performanceScore: 88
    });

    expect(result.valid).toBe(true);
    expect(result.event?.region).toBe("US");
  });

  it("rejects malformed events", () => {
    const result = validateCSIEvent({
      subsystem: "",
      eventType: "",
      region: "",
      timestamp: Number.NaN,
      metrics: { error: "invalid metrics" }
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("emits and subscribes to events", async () => {
    const handler = jest.fn();
    const subscription = subscribeToEventBus(handler);

    emitCSIEvent(
      createCSIEvent({
        subsystem: "ecommerce",
        eventType: "order.created",
        region: "US",
        metrics: { total: 1 }
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 5));
    subscription.unsubscribe();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(getCSIEventHistory().length).toBe(1);
  });

  it("creates subsystem-specific emitters", () => {
    const emitEcommerceEvent = createSubsystemEmitter("ecommerce");
    const event = emitEcommerceEvent("order.paid", "US", { amountUsd: 120 });

    expect(event.subsystem).toBe("ecommerce");
    expect(event.eventType).toBe("order.paid");
    expect(getCSIEventHistory().length).toBe(1);
  });
});
