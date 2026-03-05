import { CSIEvent, subscribeToEventBus, validateCSIEvent } from "../events";

export interface CSIIngestionMetrics {
  received: number;
  accepted: number;
  rejected: number;
  deduplicated: number;
  lastReceivedAt?: number;
}

export interface CSIIngestionOptions {
  subsystemAllowList?: string[];
  dedupeWindowMs?: number;
}

export type CSIIngestionProcessor = (event: CSIEvent) => Promise<void> | void;

function fingerprintEvent(event: CSIEvent): string {
  return JSON.stringify({
    subsystem: event.subsystem,
    eventType: event.eventType,
    region: event.region,
    timestamp: event.timestamp,
    riskScore: event.riskScore ?? null,
    performanceScore: event.performanceScore ?? null,
    metrics: event.metrics,
  });
}

export class CSIIngestionEngine {
  private readonly processor: CSIIngestionProcessor;
  private readonly options: Required<Pick<CSIIngestionOptions, "dedupeWindowMs">> & CSIIngestionOptions;
  private readonly seen = new Map<string, number>();
  private unsubscribeFn?: () => void;
  private running = false;
  private metrics: CSIIngestionMetrics = {
    received: 0,
    accepted: 0,
    rejected: 0,
    deduplicated: 0,
  };

  constructor(processor: CSIIngestionProcessor, options: CSIIngestionOptions = {}) {
    this.processor = processor;
    this.options = {
      ...options,
      dedupeWindowMs: options.dedupeWindowMs ?? 15_000,
    };
  }

  startIngestion(): void {
    if (this.running) {
      return;
    }

    // Subscribe to the shared bus so every subsystem stream is observed.
    const subscription = subscribeToEventBus(async (event) => {
      await this.handleEvent(event);
    });

    this.unsubscribeFn = subscription.unsubscribe;
    this.running = true;
  }

  stopIngestion(): void {
    if (!this.running) {
      return;
    }

    this.unsubscribeFn?.();
    this.unsubscribeFn = undefined;
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getMetrics(): CSIIngestionMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      received: 0,
      accepted: 0,
      rejected: 0,
      deduplicated: 0,
      lastReceivedAt: undefined,
    };
  }

  private async handleEvent(event: CSIEvent): Promise<void> {
    this.metrics.received += 1;
    this.metrics.lastReceivedAt = Date.now();

    if (this.options.subsystemAllowList && !this.options.subsystemAllowList.includes(event.subsystem)) {
      this.metrics.rejected += 1;
      return;
    }

    const validation = validateCSIEvent(event);
    if (!validation.valid || !validation.event) {
      this.metrics.rejected += 1;
      return;
    }

    this.pruneSeen(validation.event.timestamp);
    const signature = fingerprintEvent(validation.event);
    if (this.seen.has(signature)) {
      this.metrics.deduplicated += 1;
      return;
    }

    this.seen.set(signature, validation.event.timestamp);
    this.metrics.accepted += 1;
    await this.processor(validation.event);
  }

  private pruneSeen(referenceTimestamp: number): void {
    for (const [signature, timestamp] of this.seen.entries()) {
      if (referenceTimestamp - timestamp > this.options.dedupeWindowMs) {
        this.seen.delete(signature);
      }
    }
  }
}

export function subscribeToAllEventStreams(
  processor: CSIIngestionProcessor,
  options: CSIIngestionOptions = {},
): CSIIngestionEngine {
  const engine = new CSIIngestionEngine(processor, options);
  engine.startIngestion();
  return engine;
}
