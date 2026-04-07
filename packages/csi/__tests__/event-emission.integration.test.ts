import { clearCSIEventHistory, getCSIEventHistory, createSubsystemEmitter } from "../events";
import {
  emitAIProgramsEvent,
  emitBillingEvent,
  emitEcommerceEvent,
  emitCommunicationEvent,
  emitLocalizationEvent,
  emitMatchmakingEvent,
  emitPlacesEvent
} from "../../../pulse-connect-core/src/csi/instrumentation";

describe("subsystem event emission", () => {
  beforeEach(() => {
    clearCSIEventHistory();
  });

  it("emits standardized events for all primary subsystem instrumentation wrappers", () => {
    emitEcommerceEvent("order.created", "US", { totalUsd: 100 });
    emitPlacesEvent("place.created", "KE", { placeId: "pl-1" });
    emitMatchmakingEvent("matching.generated", "GLOBAL", { briefId: 1 });
    emitAIProgramsEvent("ai-program.execution-completed", "US", { runId: "run-1" });
    emitLocalizationEvent("translation.completed", "FR", { traceId: "trace-1" });
    emitCommunicationEvent("message.sent", "US", { messageId: "msg-1" });
    emitBillingEvent("billing.charge.recorded", "US", { chargeId: "chg-1" });

    const emitMarketingEvent = createSubsystemEmitter("marketing");
    emitMarketingEvent("marketing.campaign.executed", "GLOBAL", { campaignId: "cmp-1" });

    const history = getCSIEventHistory();
    const subsystems = new Set(history.map((event) => event.subsystem));

    expect(history.length).toBe(8);
    expect(subsystems.has("ecommerce")).toBe(true);
    expect(subsystems.has("places")).toBe(true);
    expect(subsystems.has("matchmaking")).toBe(true);
    expect(subsystems.has("ai-programs")).toBe(true);
    expect(subsystems.has("localization")).toBe(true);
    expect(subsystems.has("marketing")).toBe(true);
    expect(subsystems.has("communication")).toBe(true);
    expect(subsystems.has("billing")).toBe(true);
  });
});
