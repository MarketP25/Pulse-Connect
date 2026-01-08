import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

export interface AccountingEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  trace_id: string;
  [key: string]: any;
}

export class AccountingConsumer {
  private kafka: Kafka;
  private consumer: Consumer;
  private pool: Pool;
  private processedEvents: Set<string> = new Set();

  constructor(kafkaConfig: any, dbPool: Pool) {
    this.kafka = new Kafka({
      clientId: "accounting-service",
      brokers: kafkaConfig.brokers,
      ssl: kafkaConfig.ssl,
      sasl: kafkaConfig.sasl
    });

    this.consumer = this.kafka.consumer({
      groupId: "accounting-group",
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });

    this.pool = dbPool;
  }

  async connect(): Promise<void> {
    await this.consumer.connect();
    console.log("Accounting consumer connected to Kafka");
  }

  async subscribe(): Promise<void> {
    // Subscribe to all financial events
    const topics = [
      "product-published",
      "subscription-charged",
      "order-created",
      "order-paid",
      "transaction-recorded",
      "payout-initiated",
      "dispute-created"
    ];

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      console.log(`Subscribed to topic: ${topic}`);
    }
  }

  async startConsuming(): Promise<void> {
    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload);
      }
    });
  }

  private async processMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      const event: AccountingEvent = JSON.parse(message.value?.toString() || "{}");
      const eventId = event.event_id;

      // Idempotency check
      if (this.processedEvents.has(eventId)) {
        console.log(`Event ${eventId} already processed, skipping`);
        return;
      }

      console.log(`Processing ${event.event_type} event: ${eventId}`);

      // Process based on event type
      switch (event.event_type) {
        case "subscription_charged":
          await this.processSubscriptionCharged(event);
          break;
        case "order_paid":
          await this.processOrderPaid(event);
          break;
        case "transaction_recorded":
          await this.processTransactionRecorded(event);
          break;
        case "payout_initiated":
          await this.processPayoutInitiated(event);
          break;
        case "dispute_created":
          await this.processDisputeCreated(event);
          break;
        default:
          console.log(`Unhandled event type: ${event.event_type}`);
      }

      // Mark as processed
      this.processedEvents.add(eventId);

      // Clean up old processed events (keep last 10000)
      if (this.processedEvents.size > 10000) {
        const toRemove = Array.from(this.processedEvents).slice(0, 1000);
        toRemove.forEach((id) => this.processedEvents.delete(id));
      }
    } catch (error) {
      console.error(`Error processing message from ${topic}:`, error);
      // In production, you might want to send to dead letter queue
    }
  }

  private async processSubscriptionCharged(event: AccountingEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Log subscription charge for accounting
      await client.query(
        `
        INSERT INTO accounting_events (
          id, event_type, event_data, trace_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [uuidv4(), "subscription_charge", JSON.stringify(event), event.trace_id]
      );

      // Update revenue metrics
      await this.updateRevenueMetrics(client, "subscription", event.amount_usd, event.timestamp);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processOrderPaid(event: AccountingEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Log order payment for accounting
      await client.query(
        `
        INSERT INTO accounting_events (
          id, event_type, event_data, trace_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [uuidv4(), "order_payment", JSON.stringify(event), event.trace_id]
      );

      // Update revenue metrics
      await this.updateRevenueMetrics(client, "transaction_fee", event.fee_usd, event.timestamp);
      await this.updateRevenueMetrics(client, "gmv", event.gross_usd, event.timestamp);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processTransactionRecorded(event: AccountingEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Log transaction for accounting audit trail
      await client.query(
        `
        INSERT INTO accounting_events (
          id, event_type, event_data, trace_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [uuidv4(), "transaction_record", JSON.stringify(event), event.trace_id]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processPayoutInitiated(event: AccountingEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Log payout for accounting
      await client.query(
        `
        INSERT INTO accounting_events (
          id, event_type, event_data, trace_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [uuidv4(), "payout_initiated", JSON.stringify(event), event.trace_id]
      );

      // Update payout metrics
      await this.updatePayoutMetrics(client, event.amount_usd, event.timestamp);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async processDisputeCreated(event: AccountingEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // Log dispute for accounting
      await client.query(
        `
        INSERT INTO accounting_events (
          id, event_type, event_data, trace_id, created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `,
        [uuidv4(), "dispute_created", JSON.stringify(event), event.trace_id]
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateRevenueMetrics(
    client: any,
    metricType: string,
    amount: number,
    timestamp: string
  ): Promise<void> {
    const date = new Date(timestamp).toISOString().split("T")[0];

    await client.query(
      `
      INSERT INTO revenue_metrics (date, metric_type, amount_usd, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (date, metric_type)
      DO UPDATE SET
        amount_usd = revenue_metrics.amount_usd + EXCLUDED.amount_usd,
        updated_at = NOW()
    `,
      [date, metricType, amount]
    );
  }

  private async updatePayoutMetrics(client: any, amount: number, timestamp: string): Promise<void> {
    const date = new Date(timestamp).toISOString().split("T")[0];

    await client.query(
      `
      INSERT INTO payout_metrics (date, total_payouts_usd, payout_count, updated_at)
      VALUES ($1, $2, 1, NOW())
      ON CONFLICT (date)
      DO UPDATE SET
        total_payouts_usd = payout_metrics.total_payouts_usd + EXCLUDED.total_payouts_usd,
        payout_count = payout_metrics.payout_count + 1,
        updated_at = NOW()
    `,
      [date, amount]
    );
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
    console.log("Accounting consumer disconnected");
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Check database connection
      await this.pool.query("SELECT 1");

      // Check consumer connectivity (simplified)
      const topics = await this.consumer.describeGroup();
      return topics.state === "Stable";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  }
}
