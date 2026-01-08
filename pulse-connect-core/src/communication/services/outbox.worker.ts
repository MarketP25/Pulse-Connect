import { EventOutbox } from "../events/outbox";
import { IdempotencyManager } from "../events/idempotency";

export class OutboxWorker {
  private outbox: EventOutbox;
  private idempotencyManager: IdempotencyManager;
  private isRunning: boolean = false;

  constructor() {
    this.outbox = new EventOutbox();
    this.idempotencyManager = new IdempotencyManager();
  }

  /**
   * Start the worker
   */
  start(): void {
    this.isRunning = true;
    this.processLoop();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.outbox.processEvents();
        await this.sleep(5000); // Process every 5 seconds
      } catch (error) {
        console.error("Error in outbox processing loop:", error);
        await this.sleep(10000); // Wait longer on error
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Add event to outbox
   */
  addEvent(event: any): void {
    this.outbox.addEvent(event);
  }

  /**
   * Check idempotency key
   */
  checkIdempotency(key: string): boolean {
    return this.idempotencyManager.checkKey(key);
  }

  /**
   * Replay DLQ
   */
  async replayDLQ(): Promise<void> {
    await this.outbox.replayDLQ();
  }
}
