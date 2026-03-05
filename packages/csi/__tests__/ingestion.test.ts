import { createCSIEvent, emitCSIEvent, clearCSIEventHistory } from "../events";
import { CSIIngestionEngine } from "../engine/ingestion";

describe("CSI ingestion engine", () => {
  beforeEach(() => {
    clearCSIEventHistory();
  });

  it("subscribes to event streams and processes accepted events", async () => {
    const processed: string[] = [];
    const engine = new CSIIngestionEngine(async (event) => {
      processed.push(event.eventType);
    });

    engine.startIngestion();

    emitCSIEvent(
      createCSIEvent({
        subsystem: "ecommerce",
        eventType: "order.created",
        region: "US",
        metrics: { amountUsd: 90 },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.stopIngestion();

    expect(processed).toEqual(["order.created"]);
    expect(engine.getMetrics().accepted).toBe(1);
    expect(engine.getMetrics().rejected).toBe(0);
  });

  it("deduplicates repeated events in the dedupe window", async () => {
    const processed: string[] = [];
    const engine = new CSIIngestionEngine(
      async (event) => {
        processed.push(event.eventType);
      },
      { dedupeWindowMs: 60_000 },
    );

    engine.startIngestion();

    const event = createCSIEvent({
      subsystem: "places",
      eventType: "reservation.created",
      region: "KE",
      timestamp: 1_700_000_000_000,
      metrics: { reservations: 1 },
    });

    emitCSIEvent(event);
    emitCSIEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.stopIngestion();

    expect(processed).toHaveLength(1);
    expect(engine.getMetrics().deduplicated).toBe(1);
  });

  it("filters by subsystem allow-list", async () => {
    const processed: string[] = [];
    const engine = new CSIIngestionEngine(
      async (event) => {
        processed.push(event.subsystem);
      },
      { subsystemAllowList: ["billing"] },
    );

    engine.startIngestion();

    emitCSIEvent(
      createCSIEvent({
        subsystem: "ecommerce",
        eventType: "order.created",
        region: "US",
        metrics: { amountUsd: 44 },
      }),
    );

    emitCSIEvent(
      createCSIEvent({
        subsystem: "billing",
        eventType: "invoice.issued",
        region: "US",
        metrics: { invoices: 1 },
      }),
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    engine.stopIngestion();

    expect(processed).toEqual(["billing"]);
    expect(engine.getMetrics().rejected).toBe(1);
  });
});
