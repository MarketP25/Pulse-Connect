import { CSIEvent, createSubsystemEmitter } from "../../../packages/csi/events";

const emitters = {
  ecommerce: createSubsystemEmitter("ecommerce"),
  places: createSubsystemEmitter("places"),
  matchmaking: createSubsystemEmitter("matchmaking"),
  aiPrograms: createSubsystemEmitter("ai-programs"),
  localization: createSubsystemEmitter("localization"),
  communication: createSubsystemEmitter("communication"),
  billing: createSubsystemEmitter("billing"),
  pap_vi: createSubsystemEmitter("automated marketing")
};

type ScoreShape = {
  riskScore?: number;
  performanceScore?: number;
};

function safeEmit(
  emit: (
    eventType: string,
    region: string,
    metrics: Record<string, any>,
    scores?: ScoreShape
  ) => CSIEvent,
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  try {
    return emit(eventType, region, metrics, scores);
  } catch (error) {
    console.warn(`CSI instrumentation emit failed for ${eventType}`, error);
    return undefined;
  }
}

export function emitEcommerceEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.ecommerce, eventType, region, metrics, scores);
}

export function emitPlacesEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.places, eventType, region, metrics, scores);
}

export function emitMatchmakingEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.matchmaking, eventType, region, metrics, scores);
}

export function emitAIProgramsEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.aiPrograms, eventType, region, metrics, scores);
}

export function emitLocalizationEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.localization, eventType, region, metrics, scores);
}

export function emitCommunicationEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.communication, eventType, region, metrics, scores);
}

export function emitBillingEvent(
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: ScoreShape
): CSIEvent | undefined {
  return safeEmit(emitters.billing, eventType, region, metrics, scores);
}
