import { Injectable, Logger, Inject } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { EventEmitter2 } from "eventemitter2";

export interface IntelligenceEvent {
  eventId: string;
  eventType: string;
  source: string;
  target?: string;
  payload: any;
  metadata?: {
    timestamp: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    regionCode?: string;
    decisionId?: string;
    policyId?: string;
    transactionId?: string;
    [key: string]: any;
  };
}

export interface EventSubscription {
  eventType: string;
  handler: (event: IntelligenceEvent) => Promise<void>;
  filter?: (event: IntelligenceEvent) => boolean;
  priority?: number;
}

export interface DecisionEvent extends IntelligenceEvent {
  eventType: "decision.made" | "decision.updated" | "decision.reversed";
  payload: {
    decisionId: string;
    userId: string;
    context: any;
    outcome: any;
    confidence: number;
    reasoning: string[];
    alternatives?: any[];
  };
}

export interface PolicyEvent extends IntelligenceEvent {
  eventType: "policy.activated" | "policy.deactivated" | "policy.updated";
  payload: {
    policyId: string;
    version: string;
    scope: string[];
    rules: any[];
    effectiveFrom: string;
    effectiveTo?: string;
  };
}

export interface TransactionEvent extends IntelligenceEvent {
  eventType:
    | "transaction.started"
    | "transaction.completed"
    | "transaction.failed"
    | "transaction.reversed";
  payload: {
    transactionId: string;
    type: string;
    amount?: number;
    currency?: string;
    parties: string[];
    status: string;
    metadata: any;
  };
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);
  private readonly eventEmitter = new EventEmitter2({
    wildcard: true,
    delimiter: ".",
    maxListeners: 100
  });
  private readonly subscriptions = new Map<string, EventSubscription[]>();
  private readonly eventHistory: IntelligenceEvent[] = [];
  private readonly maxHistorySize = 10000;
  private readonly decisionCache = new Map<string, DecisionEvent>();
  private readonly policyCache = new Map<string, PolicyEvent>();

  constructor(@Inject("KAFKA_CLIENT") private readonly kafkaClient: ClientKafka) {
    this.initializeEventHandlers();
    this.initializeDecisionEngine();
    this.initializePolicyEngine();
  }

  /**
   * Initialize default event handlers for intelligence core
   */
  private initializeEventHandlers() {
    // Handle decision events
    this.subscribe("decision.*", async (event) => {
      await this.handleDecisionEvent(event as DecisionEvent);
    });

    // Handle policy events
    this.subscribe("policy.*", async (event) => {
      await this.handlePolicyEvent(event as PolicyEvent);
    });

    // Handle transaction events
    this.subscribe("transaction.*", async (event) => {
      await this.handleTransactionEvent(event as TransactionEvent);
    });

    // Handle system events
    this.subscribe("system.*", async (event) => {
      this.logger.debug(`System event received: ${event.eventType}`);
    });

    // Handle error events
    this.subscribe("error.*", async (event) => {
      this.logger.error(`Error event: ${event.eventType}`, event.payload);
    });

    // Handle telemetry events
    this.subscribe("telemetry.*", async (event) => {
      await this.forwardToTelemetry(event);
    });
  }

  /**
   * Initialize decision engine event handlers
   */
  private initializeDecisionEngine() {
    this.subscribe("decision.made", async (event: DecisionEvent) => {
      this.decisionCache.set(event.payload.decisionId, event);
      await this.evaluateDecisionImpact(event);
    });

    this.subscribe("decision.reversed", async (event: DecisionEvent) => {
      const originalDecision = this.decisionCache.get(event.payload.decisionId);
      if (originalDecision) {
        await this.handleDecisionReversal(originalDecision, event);
      }
    });
  }

  /**
   * Initialize policy engine event handlers
   */
  private initializePolicyEngine() {
    this.subscribe("policy.activated", async (event: PolicyEvent) => {
      this.policyCache.set(event.payload.policyId, event);
      await this.applyPolicyRules(event);
    });

    this.subscribe("policy.deactivated", async (event: PolicyEvent) => {
      this.policyCache.delete(event.payload.policyId);
      await this.removePolicyRules(event);
    });
  }

  /**
   * Publish an event to the event bus
   */
  async publish(event: IntelligenceEvent): Promise<void> {
    try {
      // Add timestamp if not provided
      if (!event.metadata?.timestamp) {
        event.metadata = { ...event.metadata, timestamp: new Date().toISOString() };
      }

      // Generate event ID if not provided
      if (!event.eventId) {
        event.eventId = this.generateEventId();
      }

      this.logger.debug(`Publishing intelligence event: ${event.eventType} (${event.eventId})`);

      // Store in history
      this.addToHistory(event);

      // Emit locally
      await this.eventEmitter.emitAsync(event.eventType, event);

      // Forward to Kafka for distributed processing
      await this.forwardToKafka(event);
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  subscribe(
    eventPattern: string,
    handler: (event: IntelligenceEvent) => Promise<void>,
    filter?: (event: IntelligenceEvent) => boolean,
    priority: number = 0
  ): void {
    const subscription: EventSubscription = {
      eventType: eventPattern,
      handler,
      filter,
      priority
    };

    if (!this.subscriptions.has(eventPattern)) {
      this.subscriptions.set(eventPattern, []);
    }

    const subs = this.subscriptions.get(eventPattern)!;
    subs.push(subscription);
    subs.sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Higher priority first

    // Register with EventEmitter2
    this.eventEmitter.on(eventPattern, async (event: IntelligenceEvent) => {
      try {
        // Apply filter if provided
        if (filter && !filter(event)) {
          return;
        }

        await handler(event);
      } catch (error) {
        this.logger.error(`Event handler error for ${eventPattern}: ${error.message}`);
      }
    });

    this.logger.debug(`Subscribed to intelligence event pattern: ${eventPattern}`);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(eventPattern: string, handler?: (event: IntelligenceEvent) => Promise<void>): void {
    if (handler) {
      // Remove specific handler
      const subs = this.subscriptions.get(eventPattern);
      if (subs) {
        const index = subs.findIndex((sub) => sub.handler === handler);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    } else {
      // Remove all handlers for pattern
      this.subscriptions.delete(eventPattern);
    }

    this.eventEmitter.removeAllListeners(eventPattern);
    this.logger.debug(`Unsubscribed from intelligence event pattern: ${eventPattern}`);
  }

  /**
   * Publish event to specific target subsystem
   */
  async publishToTarget(event: IntelligenceEvent, targetSubsystem: string): Promise<void> {
    event.target = targetSubsystem;
    await this.publish(event);
  }

  /**
   * Request-response pattern for intelligence queries
   */
  async request(event: IntelligenceEvent, timeoutMs: number = 30000): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const correlationId = event.metadata?.correlationId || this.generateCorrelationId();
      event.metadata = { ...event.metadata, correlationId };

      // Set up response handler
      const responsePattern = `response.${correlationId}`;
      const timeout = setTimeout(() => {
        this.unsubscribe(responsePattern);
        reject(new Error(`Request timeout for intelligence event: ${event.eventType}`));
      }, timeoutMs);

      this.subscribe(responsePattern, async (responseEvent) => {
        clearTimeout(timeout);
        this.unsubscribe(responsePattern);
        resolve(responseEvent.payload);
      });

      // Publish the request
      await this.publish(event);
    });
  }

  /**
   * Respond to a request
   */
  async respond(correlationId: string, payload: any): Promise<void> {
    const responseEvent: IntelligenceEvent = {
      eventId: this.generateEventId(),
      eventType: `response.${correlationId}`,
      source: "intelligence-core",
      payload,
      metadata: {
        correlationId,
        timestamp: new Date().toISOString()
      }
    };

    await this.publish(responseEvent);
  }

  /**
   * Publish decision event
   */
  async publishDecision(
    decision: Omit<DecisionEvent["payload"], "decisionId"> & { decisionId?: string }
  ): Promise<string> {
    const decisionId = decision.decisionId || this.generateDecisionId();
    const event: DecisionEvent = {
      eventId: this.generateEventId(),
      eventType: "decision.made",
      source: "intelligence-core",
      payload: { ...decision, decisionId },
      metadata: {
        timestamp: new Date().toISOString(),
        decisionId,
        userId: decision.userId
      }
    };

    await this.publish(event);
    return decisionId;
  }

  /**
   * Publish policy event
   */
  async publishPolicy(policy: PolicyEvent["payload"]): Promise<void> {
    const event: PolicyEvent = {
      eventId: this.generateEventId(),
      eventType: "policy.activated",
      source: "intelligence-core",
      payload: policy,
      metadata: {
        timestamp: new Date().toISOString(),
        policyId: policy.policyId
      }
    };

    await this.publish(event);
  }

  /**
   * Publish transaction event
   */
  async publishTransaction(transaction: TransactionEvent["payload"]): Promise<void> {
    const event: TransactionEvent = {
      eventId: this.generateEventId(),
      eventType: `transaction.${transaction.status}`,
      source: "intelligence-core",
      payload: transaction,
      metadata: {
        timestamp: new Date().toISOString(),
        transactionId: transaction.transactionId,
        userId: transaction.parties[0] // Primary party
      }
    };

    await this.publish(event);
  }

  /**
   * Get event history
   */
  getEventHistory(limit: number = 100): IntelligenceEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get decision history for user
   */
  getDecisionHistory(userId: string, limit: number = 50): DecisionEvent[] {
    return this.eventHistory
      .filter(
        (event) => event.eventType.startsWith("decision.") && event.metadata?.userId === userId
      )
      .slice(-limit) as DecisionEvent[];
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): Array<{ pattern: string; count: number }> {
    return Array.from(this.subscriptions.entries()).map(([pattern, subs]) => ({
      pattern,
      count: subs.length
    }));
  }

  /**
   * Get cached decision
   */
  getDecision(decisionId: string): DecisionEvent | undefined {
    return this.decisionCache.get(decisionId);
  }

  /**
   * Get active policies
   */
  getActivePolicies(): PolicyEvent[] {
    return Array.from(this.policyCache.values()).filter(
      (policy) => !policy.payload.effectiveTo || new Date(policy.payload.effectiveTo) > new Date()
    );
  }

  /**
   * Handle decision events
   */
  private async handleDecisionEvent(event: DecisionEvent): Promise<void> {
    // Implement decision impact analysis
    await this.evaluateDecisionImpact(event);
  }

  /**
   * Handle policy events
   */
  private async handlePolicyEvent(event: PolicyEvent): Promise<void> {
    // Implement policy rule application
    if (event.eventType === "policy.activated") {
      await this.applyPolicyRules(event);
    }
  }

  /**
   * Handle transaction events
   */
  private async handleTransactionEvent(event: TransactionEvent): Promise<void> {
    // Implement transaction monitoring
    if (event.eventType === "transaction.failed") {
      await this.handleFailedTransaction(event);
    }
  }

  /**
   * Evaluate decision impact
   */
  private async evaluateDecisionImpact(decision: DecisionEvent): Promise<void> {
    // Analyze decision confidence and alternatives
    if (decision.payload.confidence < 0.7) {
      this.logger.warn(`Low confidence decision: ${decision.payload.decisionId}`);
    }

    // Check for decision conflicts
    await this.checkDecisionConflicts(decision);
  }

  /**
   * Handle decision reversal
   */
  private async handleDecisionReversal(
    original: DecisionEvent,
    reversal: DecisionEvent
  ): Promise<void> {
    this.logger.warn(`Decision reversed: ${original.payload.decisionId}`);
    // Implement reversal logic
  }

  /**
   * Apply policy rules
   */
  private async applyPolicyRules(policy: PolicyEvent): Promise<void> {
    // Implement policy rule application logic
    this.logger.debug(`Applying policy rules for: ${policy.payload.policyId}`);
  }

  /**
   * Remove policy rules
   */
  private async removePolicyRules(policy: PolicyEvent): Promise<void> {
    // Implement policy rule removal logic
    this.logger.debug(`Removing policy rules for: ${policy.payload.policyId}`);
  }

  /**
   * Handle failed transaction
   */
  private async handleFailedTransaction(transaction: TransactionEvent): Promise<void> {
    this.logger.error(`Transaction failed: ${transaction.payload.transactionId}`);
    // Implement failure handling logic
  }

  /**
   * Check for decision conflicts
   */
  private async checkDecisionConflicts(decision: DecisionEvent): Promise<void> {
    // Implement conflict detection logic
  }

  /**
   * Forward event to Kafka
   */
  private async forwardToKafka(event: IntelligenceEvent): Promise<void> {
    try {
      const kafkaMessage = {
        topic: "intelligence.events",
        messages: [
          {
            key: event.eventId,
            value: JSON.stringify({
              ...event,
              forwardedAt: new Date().toISOString()
            })
          }
        ]
      };

      // In production: await this.kafkaClient.send(kafkaMessage);
      this.logger.debug(`Intelligence event forwarded to Kafka: ${event.eventType}`);
    } catch (error) {
      this.logger.warn(`Failed to forward intelligence event to Kafka: ${error.message}`);
    }
  }

  /**
   * Forward telemetry events
   */
  private async forwardToTelemetry(event: IntelligenceEvent): Promise<void> {
    // Could integrate with TelemetryService here
    this.logger.debug(`Intelligence telemetry event forwarded: ${event.eventType}`);
  }

  /**
   * Add event to history
   */
  private addToHistory(event: IntelligenceEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `int_evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `int_corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate decision ID
   */
  private generateDecisionId(): string {
    return `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check for event bus
   */
  async healthCheck(): Promise<{ healthy: boolean; metrics: any }> {
    const metrics = {
      totalEvents: this.eventHistory.length,
      activeSubscriptions: this.subscriptions.size,
      totalHandlers: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.length,
        0
      ),
      cachedDecisions: this.decisionCache.size,
      activePolicies: this.policyCache.size
    };

    return {
      healthy: true, // Basic health check
      metrics
    };
  }
}
