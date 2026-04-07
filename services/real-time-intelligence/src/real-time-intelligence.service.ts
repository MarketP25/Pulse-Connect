import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ClientKafka, MessagePattern } from "@nestjs/microservices";
import { Observable, Subject, BehaviorSubject } from "rxjs";
import { PlanetaryEvent } from "./entities/planetary-event.entity";
import { CorrelatedEvent } from "./entities/correlated-event.entity";
import { PlanetaryInsight } from "./entities/planetary-insight.entity";

@Injectable()
export class RealTimeIntelligenceService implements OnModuleInit {
  private readonly logger = new Logger(RealTimeIntelligenceService.name);

  // Real-time event streams
  private planetaryEventStream = new Subject<PlanetaryEvent>();
  private correlatedEventStream = new Subject<CorrelatedEvent>();
  private insightStream = new Subject<PlanetaryInsight>();

  // Current planetary state
  private planetaryState = new BehaviorSubject<any>({});
  private activeCorrelations = new Map<string, CorrelatedEvent>();

  constructor(private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    // Subscribe to planetary event streams
    await this.kafkaClient.connect();

    this.logger.log("Real-time Intelligence Service initialized");
    this.startEventProcessing();
  }

  /**
   * Get real-time planetary event stream
   */
  getPlanetaryEventStream(): Observable<PlanetaryEvent> {
    return this.planetaryEventStream.asObservable();
  }

  /**
   * Get correlated event stream
   */
  getCorrelatedEventStream(): Observable<CorrelatedEvent> {
    return this.correlatedEventStream.asObservable();
  }

  /**
   * Get planetary insights stream
   */
  getInsightStream(): Observable<PlanetaryInsight> {
    return this.insightStream.asObservable();
  }

  /**
   * Get current planetary state
   */
  getCurrentPlanetaryState(): Observable<any> {
    return this.planetaryState.asObservable();
  }

  /**
   * Process incoming planetary events
   */
  @MessagePattern("planetary.events")
  async processPlanetaryEvent(event: PlanetaryEvent) {
    try {
      this.logger.debug(`Processing planetary event: ${event.id}`);

      // Emit to real-time stream
      this.planetaryEventStream.next(event);

      // Process for correlations
      await this.processEventCorrelations(event);

      // Update planetary state
      await this.updatePlanetaryState(event);

      // Generate real-time insights
      await this.generateRealTimeInsights(event);
    } catch (error) {
      this.logger.error(`Failed to process planetary event: ${error.message}`);
    }
  }

  /**
   * Correlate events across subsystems
   */
  private async processEventCorrelations(event: PlanetaryEvent): Promise<void> {
    const correlations = await this.findEventCorrelations(event);

    for (const correlation of correlations) {
      const correlatedEvent: CorrelatedEvent = {
        id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        primaryEvent: event,
        relatedEvents: correlation.relatedEvents,
        correlationType: correlation.type,
        strength: correlation.strength,
        description: correlation.description,
        affectedSubsystems: correlation.affectedSubsystems,
        timestamp: new Date()
      };

      // Store active correlation
      this.activeCorrelations.set(correlatedEvent.id, correlatedEvent);

      // Emit correlated event
      this.correlatedEventStream.next(correlatedEvent);

      // Emit to Kafka for other services
      await this.kafkaClient.emit("planetary.correlations", correlatedEvent);
    }
  }

  /**
   * Update planetary state with new event
   */
  private async updatePlanetaryState(event: PlanetaryEvent): Promise<void> {
    const currentState = this.planetaryState.value;

    // Update subsystem metrics
    if (!currentState.subsystems) currentState.subsystems = {};
    if (!currentState.subsystems[event.subsystem]) {
      currentState.subsystems[event.subsystem] = {
        eventCount: 0,
        lastEvent: null,
        activeUsers: new Set(),
        healthScore: 100
      };
    }

    const subsystemState = currentState.subsystems[event.subsystem];
    subsystemState.eventCount++;
    subsystemState.lastEvent = event.timestamp;

    if (event.userId) {
      subsystemState.activeUsers.add(event.userId);
    }

    // Update planetary health
    currentState.healthScore = this.calculatePlanetaryHealth(currentState);
    currentState.lastUpdate = new Date();

    // Emit updated state
    this.planetaryState.next({ ...currentState });
  }

  /**
   * Generate real-time insights from events
   */
  private async generateRealTimeInsights(event: PlanetaryEvent): Promise<void> {
    const insights = await this.analyzeEventForInsights(event);

    for (const insight of insights) {
      const planetaryInsight: PlanetaryInsight = {
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: insight.type,
        severity: insight.severity,
        title: insight.title,
        description: insight.description,
        affectedEntities: insight.affectedEntities,
        recommendedActions: insight.recommendedActions,
        confidence: insight.confidence,
        sourceEvent: event,
        timestamp: new Date()
      };

      // Emit insight
      this.insightStream.next(planetaryInsight);

      // Emit to Kafka for distribution
      await this.kafkaClient.emit("planetary.insights", planetaryInsight);
    }
  }

  /**
   * Find correlations between events
   */
  private async findEventCorrelations(event: PlanetaryEvent): Promise<any[]> {
    const correlations = [];

    // User behavior correlations
    if (event.userId) {
      const userCorrelations = await this.findUserBehaviorCorrelations(event);
      correlations.push(...userCorrelations);
    }

    // Subsystem correlations
    const subsystemCorrelations = await this.findSubsystemCorrelations(event);
    correlations.push(...subsystemCorrelations);

    // Geographic correlations
    if (event.location) {
      const geoCorrelations = await this.findGeographicCorrelations(event);
      correlations.push(...geoCorrelations);
    }

    // Time-based correlations
    const timeCorrelations = await this.findTimeBasedCorrelations(event);
    correlations.push(...timeCorrelations);

    return correlations;
  }

  /**
   * Calculate planetary health score
   */
  private calculatePlanetaryHealth(state: any): number {
    let totalHealth = 0;
    let subsystemCount = 0;

    for (const subsystem of Object.values(state.subsystems) as any[]) {
      const subsystemHealth = this.calculateSubsystemHealth(subsystem);
      totalHealth += subsystemHealth;
      subsystemCount++;
    }

    return subsystemCount > 0 ? totalHealth / subsystemCount : 100;
  }

  /**
   * Calculate subsystem health
   */
  private calculateSubsystemHealth(subsystem: any): number {
    let health = 100;

    // Reduce health based on event frequency (too many events might indicate issues)
    if (subsystem.eventCount > 1000) {
      health -= 10;
    }

    // Reduce health if no recent events (might indicate downtime)
    const timeSinceLastEvent = Date.now() - new Date(subsystem.lastEvent).getTime();
    if (timeSinceLastEvent > 300000) {
      // 5 minutes
      health -= 20;
    }

    // Reduce health if too many active users (potential overload)
    if (subsystem.activeUsers.size > 10000) {
      health -= 15;
    }

    return Math.max(0, Math.min(100, health));
  }

  // Correlation helper methods
  private async findUserBehaviorCorrelations(event: PlanetaryEvent): Promise<any[]> {
    // Implementation for user behavior pattern detection
    return [];
  }

  private async findSubsystemCorrelations(event: PlanetaryEvent): Promise<any[]> {
    // Implementation for subsystem interaction patterns
    return [];
  }

  private async findGeographicCorrelations(event: PlanetaryEvent): Promise<any[]> {
    // Implementation for geographic pattern detection
    return [];
  }

  private async findTimeBasedCorrelations(event: PlanetaryEvent): Promise<any[]> {
    // Implementation for time-based pattern detection
    return [];
  }

  private async analyzeEventForInsights(event: PlanetaryEvent): Promise<any[]> {
    // Implementation for real-time insight generation
    return [];
  }

  /**
   * Get active correlations
   */
  getActiveCorrelations(): CorrelatedEvent[] {
    return Array.from(this.activeCorrelations.values());
  }

  /**
   * Clear old correlations
   */
  clearOldCorrelations(olderThanMinutes: number = 60): void {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    for (const [id, correlation] of this.activeCorrelations) {
      if (correlation.timestamp < cutoffTime) {
        this.activeCorrelations.delete(id);
      }
    }
  }
}
