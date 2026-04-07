import { EventEmitter } from "events";

export const CSI_PRIMARY_SUBSYSTEMS = [
  "ecommerce",
  "places",
  "matchmaking",
  "ai-programs",
  "localization",
  "marketing",
  "communication",
  "billing",
  "pap_v1"
] as const;

export type CSIPrimarySubsystem = (typeof CSI_PRIMARY_SUBSYSTEMS)[number];

export interface CSIEvent {
  subsystem: string;
  eventType: string;
  region: string;
  timestamp: number;
  metrics: Record<string, any>;
  riskScore?: number;
  performanceScore?: number;
}

export interface CSIEventValidationResult {
  valid: boolean;
  errors: string[];
  event?: CSIEvent;
}

export type CSIEventHandler = (event: CSIEvent) => void | Promise<void>;

export interface CSIEventSubscription {
  unsubscribe: () => void;
}

const EVENT_TOPIC = "csi.event";
const HISTORY_LIMIT = 5000;
const bus = new EventEmitter();
const history: CSIEvent[] = [];

bus.setMaxListeners(1000);

export function isPrimarySubsystem(subsystem: string): subsystem is CSIPrimarySubsystem {
  return (CSI_PRIMARY_SUBSYSTEMS as readonly string[]).includes(subsystem);
}

export function validateCSIEvent(candidate: Partial<CSIEvent>): CSIEventValidationResult {
  const errors: string[] = [];

  if (typeof candidate.subsystem !== "string" || candidate.subsystem.trim().length === 0) {
    errors.push("subsystem is required and must be a non-empty string");
  }

  if (typeof candidate.eventType !== "string" || candidate.eventType.trim().length === 0) {
    errors.push("eventType is required and must be a non-empty string");
  }

  if (typeof candidate.region !== "string" || candidate.region.trim().length === 0) {
    errors.push("region is required and must be a non-empty string");
  }

  if (typeof candidate.timestamp !== "number" || !Number.isFinite(candidate.timestamp)) {
    errors.push("timestamp is required and must be a finite number");
  }

  if (
    !candidate.metrics ||
    typeof candidate.metrics !== "object" ||
    Array.isArray(candidate.metrics)
  ) {
    errors.push("metrics is required and must be an object");
  }

  if (
    candidate.riskScore !== undefined &&
    (typeof candidate.riskScore !== "number" ||
      candidate.riskScore < 0 ||
      candidate.riskScore > 100)
  ) {
    errors.push("riskScore must be a number between 0 and 100 when provided");
  }

  if (
    candidate.performanceScore !== undefined &&
    (typeof candidate.performanceScore !== "number" ||
      candidate.performanceScore < 0 ||
      candidate.performanceScore > 100)
  ) {
    errors.push("performanceScore must be a number between 0 and 100 when provided");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const event: CSIEvent = {
    subsystem: candidate.subsystem!.trim(),
    eventType: candidate.eventType!.trim(),
    region: candidate.region!.trim().toUpperCase(),
    timestamp: Math.floor(candidate.timestamp!),
    metrics: { ...candidate.metrics },
    riskScore: candidate.riskScore,
    performanceScore: candidate.performanceScore
  };

  return { valid: true, errors: [], event };
}

export function createCSIEvent(
  input: Omit<CSIEvent, "timestamp"> & { timestamp?: number }
): CSIEvent {
  const result = validateCSIEvent({
    ...input,
    timestamp: input.timestamp ?? Date.now()
  });

  if (!result.valid || !result.event) {
    throw new Error(`Invalid CSI event: ${result.errors.join("; ")}`);
  }

  return result.event;
}

function pushHistory(event: CSIEvent): void {
  history.push(event);
  if (history.length > HISTORY_LIMIT) {
    history.shift();
  }
}

export function emitCSIEvent(event: CSIEvent): CSIEvent {
  const result = validateCSIEvent(event);
  if (!result.valid || !result.event) {
    throw new Error(`Cannot emit invalid CSI event: ${result.errors.join("; ")}`);
  }

  const normalized = result.event;

  bus.emit(EVENT_TOPIC, normalized);
  bus.emit(`${EVENT_TOPIC}.${normalized.subsystem}`, normalized);
  bus.emit(`${EVENT_TOPIC}.type.${normalized.eventType}`, normalized);
  pushHistory(normalized);

  return normalized;
}

export function emitSubsystemEvent(
  subsystem: string,
  eventType: string,
  region: string,
  metrics: Record<string, any>,
  scores?: Pick<CSIEvent, "riskScore" | "performanceScore">
): CSIEvent {
  return emitCSIEvent(
    createCSIEvent({
      subsystem,
      eventType,
      region,
      metrics,
      riskScore: scores?.riskScore,
      performanceScore: scores?.performanceScore
    })
  );
}

export function createSubsystemEmitter(subsystem: string) {
  return (
    eventType: string,
    region: string,
    metrics: Record<string, any>,
    scores?: Pick<CSIEvent, "riskScore" | "performanceScore">
  ): CSIEvent => emitSubsystemEvent(subsystem, eventType, region, metrics, scores);
}

export function subscribeToEventBus(
  handler: CSIEventHandler,
  filters?: { subsystem?: string; eventType?: string }
): CSIEventSubscription {
  const listener = (event: CSIEvent): void => {
    if (filters?.subsystem && filters.subsystem !== event.subsystem) {
      return;
    }

    if (filters?.eventType && filters.eventType !== event.eventType) {
      return;
    }

    Promise.resolve(handler(event)).catch((error: unknown) => {
      console.error("CSI event handler failed", error);
    });
  };

  bus.on(EVENT_TOPIC, listener);
  return {
    unsubscribe: () => {
      bus.off(EVENT_TOPIC, listener);
    }
  };
}

export function getCSIEventHistory(limit = HISTORY_LIMIT): CSIEvent[] {
  const safeLimit = Math.max(0, Math.min(HISTORY_LIMIT, limit));
  if (safeLimit === 0) {
    return [];
  }

  return history.slice(-safeLimit);
}

export function clearCSIEventHistory(): void {
  history.length = 0;
}
