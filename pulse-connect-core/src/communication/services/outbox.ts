export interface OutboxEvent {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: "pending" | "processing" | "processed" | "failed";
  created_at: Date;
  processed_at?: Date;
  retry_count: number;
}

export interface DeadLetterEvent extends OutboxEvent {
  error_message: string;
  failed_at: Date;
}

export class EventOutbox {
  private events: OutboxEvent[] = [];
  private dlq: DeadLetterEvent[] = [];

  /**
   * Add event to outbox
   */
  addEvent(event: Omit<OutboxEvent, "id" | "status" | "created_at" | "retry_count">): void {
    const outboxEvent: OutboxEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      created_at: new Date(),
      retry_count: 0,
      ...event
    };
    this.events.push(outboxEvent);
  }

  /**
   * Process pending events
   */
  async processEvents(): Promise<void> {
    const pendingEvents = this.events.filter((e) => e.status === "pending");
    for (const event of pendingEvents) {
      try {
        event.status = "processing";
        // Simulate processing
        await this.processEvent(event);
        event.status = "processed";
        event.processed_at = new Date();
      } catch (error) {
        event.retry_count++;
        if (event.retry_count >= 3) {
          this.moveToDLQ(event, error.message);
        } else {
          event.status = "pending"; // Retry later
        }
      }
    }
  }

  /**
   * Process individual event (stub)
   */
  private async processEvent(event: OutboxEvent): Promise<void> {
    console.log(`Processing event ${event.event_type}:`, event.payload);
    // Stub implementation - assume success
  }

  /**
   * Move failed event to DLQ
   */
  private moveToDLQ(event: OutboxEvent, errorMessage: string): void {
    const dlqEvent: DeadLetterEvent = {
      ...event,
      error_message: errorMessage,
      failed_at: new Date()
    };
    this.dlq.push(dlqEvent);
    // Remove from main outbox
    this.events = this.events.filter((e) => e.id !== event.id);
  }

  /**
   * Replay events from DLQ
   */
  async replayDLQ(): Promise<void> {
    const eventsToReplay = [...this.dlq];
    this.dlq = [];
    for (const event of eventsToReplay) {
      this.addEvent({
        aggregate_id: event.aggregate_id,
        event_type: event.event_type,
        payload: event.payload
      });
    }
  }

  /**
   * Get DLQ events
   */
  getDLQ(): DeadLetterEvent[] {
    return [...this.dlq];
  }
}
