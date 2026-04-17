import { setTimeout as sleep } from "timers/promises";
import { DiscoveryEngineRuntime, PersistedCycleEnvelope } from "./runtime";

export class DiscoveryCycleScheduler {
  private readonly runtime: DiscoveryEngineRuntime;
  private readonly intervalMs: number;
  private readonly startupJitterMs: number;
  private timer?: NodeJS.Timeout;
  private active = false;
  private paused = false;
  private lastRun?: PersistedCycleEnvelope;
  private lastError?: string;

  constructor(runtime: DiscoveryEngineRuntime, intervalMs: number, startupJitterMs: number) {
    this.runtime = runtime;
    this.intervalMs = intervalMs;
    this.startupJitterMs = startupJitterMs;
  }

  status() {
    return {
      active: this.active,
      paused: this.paused,
      intervalMs: this.intervalMs,
      startupJitterMs: this.startupJitterMs,
      lastRunAt: this.lastRun?.completedAt,
      lastCycleId: this.lastRun?.cycleId,
      lastError: this.lastError
    };
  }

  async start(): Promise<void> {
    if (this.active) {
      return;
    }

    this.active = true;

    const jitter = Math.floor(Math.random() * Math.max(0, this.startupJitterMs));
    if (jitter > 0) {
      await sleep(jitter);
    }

    if (!this.paused) {
      await this.runOnce();
    }

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);

    this.timer.unref();
  }

  stop(): void {
    this.active = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  async runOnce(): Promise<PersistedCycleEnvelope | null> {
    if (this.paused || this.runtime.isExecuting()) {
      return null;
    }

    try {
      const run = await this.runtime.runCycle("scheduled");
      this.lastRun = run;
      this.lastError = undefined;
      return run;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown scheduler error";
      return null;
    }
  }
}
