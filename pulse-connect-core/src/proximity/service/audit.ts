export interface AuditEvent {
  id: string;
  timestamp: Date;
  actorId: string;
  subsystem: string;
  action: string;
  purpose: 'fraud' | 'matchmaking' | 'delivery' | 'marketing' | 'localization';
  policyVersion: string;
  reasonCode: string;
  requestId: string;
  metadata: Record<string, any>;
  result: 'success' | 'failure' | 'denied';
}

export interface AuditConfig {
  sinkUrl: string;
  apiKey: string;
  batchSize: number;
  flushIntervalMs: number;
  retentionDays: number;
}

export class AuditEngine {
  private config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AuditConfig) {
    this.config = config;
    this.startFlushTimer();
  }

  /**
   * Record an audit event
   */
  async record(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.eventBuffer.push(auditEvent);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Record a geocoding operation
   */
  async recordGeocoding(params: {
    actorId: string;
    subsystem: string;
    purpose: string;
    requestId: string;
    address?: string;
    lat?: number;
    lng?: number;
    provider: string;
    cacheHit: boolean;
    fallbackUsed: boolean;
    latencyMs: number;
    precision: string;
    result: 'success' | 'failure';
  }): Promise<void> {
    await this.record({
      actorId: params.actorId,
      subsystem: params.subsystem,
      action: 'geocode',
      purpose: params.purpose as any,
      policyVersion: '1.0.0',
      reasonCode: params.cacheHit ? 'CACHE_HIT' : 'GEOCODE_REQUEST',
      requestId: params.requestId,
      metadata: {
        address: params.address,
        coordinates: params.lat && params.lng ? `${params.lat},${params.lng}` : undefined,
        provider: params.provider,
        cacheHit: params.cacheHit,
        fallbackUsed: params.fallbackUsed,
        latencyMs: params.latencyMs,
        precision: params.precision
      },
      result: params.result
    });
  }

  /**
   * Record a distance calculation
   */
  async recordDistance(params: {
    actorId: string;
    subsystem: string;
    purpose: string;
    requestId: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
    distanceKm: number;
    cacheHit: boolean;
    latencyMs: number;
    result: 'success' | 'failure';
  }): Promise<void> {
    await this.record({
      actorId: params.actorId,
      subsystem: params.subsystem,
      action: 'distance',
      purpose: params.purpose as any,
      policyVersion: '1.0.0',
      reasonCode: params.cacheHit ? 'CACHE_HIT' : 'DISTANCE_CALCULATION',
      requestId: params.requestId,
      metadata: {
        from: `${params.fromLat},${params.fromLng}`,
        to: `${params.toLat},${params.toLng}`,
        distanceKm: params.distanceKm,
        cacheHit: params.cacheHit,
        latencyMs: params.latencyMs
      },
      result: params.result
    });
  }

  /**
   * Record a consent check
   */
  async recordConsent(params: {
    actorId: string;
    subsystem: string;
    purpose: string;
    requestId: string;
    consentGranted: boolean;
    policyVersion: string;
    reasonCode: string;
  }): Promise<void> {
    await this.record({
      actorId: params.actorId,
      subsystem: params.subsystem,
      action: 'consent_check',
      purpose: params.purpose as any,
      policyVersion: params.policyVersion,
      reasonCode: params.reasonCode,
      requestId: params.requestId,
      metadata: {
        consentGranted: params.consentGranted
      },
      result: params.consentGranted ? 'success' : 'denied'
    });
  }

  /**
   * Record a fraud detection event
   */
  async recordFraud(params: {
    actorId: string;
    subsystem: string;
    requestId: string;
    loginLocation: { lat: number; lng: number };
    paymentLocation: { lat: number; lng: number };
    distanceKm: number;
    riskLevel: 'low' | 'medium' | 'high';
    thresholdKm: number;
  }): Promise<void> {
    await this.record({
      actorId: params.actorId,
      subsystem: params.subsystem,
      action: 'fraud_detection',
      purpose: 'fraud',
      policyVersion: '1.0.0',
      reasonCode: 'DISTANCE_ANOMALY_CHECK',
      requestId: params.requestId,
      metadata: {
        loginLocation: `${params.loginLocation.lat},${params.loginLocation.lng}`,
        paymentLocation: `${params.paymentLocation.lat},${params.paymentLocation.lng}`,
        distanceKm: params.distanceKm,
        riskLevel: params.riskLevel,
        thresholdKm: params.thresholdKm
      },
      result: params.riskLevel === 'high' ? 'failure' : 'success'
    });
  }

  /**
   * Flush buffered events to audit sink
   */
  private async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const events = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      const response = await fetch(this.config.sinkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ events })
      });

      if (!response.ok) {
        throw new Error(`Audit sink returned ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to flush audit events:', error);
      // Re-queue events for retry
      this.eventBuffer.unshift(...events);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Periodic audit flush failed:', error);
      });
    }, this.config.flushIntervalMs);
  }

  /**
   * Stop periodic flush timer
   */
  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush(); // Final flush
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
