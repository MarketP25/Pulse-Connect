import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Pool } from 'pg';

export interface TelemetryEvent {
  requestId: string;
  subsystem: string;
  action: string;
  decision: string;
  riskScore: number;
  policyVersion: string;
  executionTime: number;
  hash: string;
  originalRequest?: any;
  policySnapshot?: string;
  regionCode?: string;
  instanceId?: string;
  timestamp: string;
}

export interface AnomalyEvent {
  anomalyType: string;
  severity: string;
  requestId?: string;
  subsystem?: string;
  description: string;
  context?: any;
  timestamp: string;
}

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Send telemetry event to MARP
   */
  async sendTelemetry(event: TelemetryEvent) {
    try {
      // Store locally first
      await this.storeTelemetryLocally(event);

      // Send to MARP via Kafka
      await this.sendToMARP(event);

      this.logger.debug(`Telemetry sent for request ${event.requestId}`);

    } catch (error) {
      this.logger.error(`Failed to send telemetry: ${error.message}`);
      // Don't throw - telemetry failures shouldn't break the main flow
    }
  }

  /**
   * Send anomaly event to MARP
   */
  async sendAnomaly(anomaly: AnomalyEvent) {
    try {
      // Store locally first
      await this.storeAnomalyLocally(anomaly);

      // Send to MARP via Kafka
      await this.sendAnomalyToMARP(anomaly);

      this.logger.warn(`Anomaly reported: ${anomaly.anomalyType} - ${anomaly.description}`);

    } catch (error) {
      this.logger.error(`Failed to send anomaly: ${error.message}`);
    }
  }

  /**
   * Store telemetry event locally
   */
  private async storeTelemetryLocally(event: TelemetryEvent) {
    const query = `
      INSERT INTO edge_telemetry (
        request_id, subsystem, action, decision, risk_score,
        policy_version, execution_time, hash, original_request,
        policy_snapshot, region_code, instance_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    await this.db.query(query, [
      event.requestId,
      event.subsystem,
      event.action,
      event.decision,
      event.riskScore,
      event.policyVersion,
      event.executionTime,
      event.hash,
      JSON.stringify(event.originalRequest || {}),
      event.policySnapshot || null,
      event.regionCode || null,
      event.instanceId || process.env.EDGE_INSTANCE_ID || 'unknown',
      event.timestamp,
    ]);
  }

  /**
   * Store anomaly event locally
   */
  private async storeAnomalyLocally(anomaly: AnomalyEvent) {
    const query = `
      INSERT INTO edge_anomalies (
        anomaly_type, severity, request_id, subsystem,
        description, context, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      anomaly.anomalyType,
      anomaly.severity,
      anomaly.requestId || null,
      anomaly.subsystem || null,
      anomaly.description,
      JSON.stringify(anomaly.context || {}),
      anomaly.timestamp,
    ]);
  }

  /**
   * Send telemetry to MARP via Kafka
   */
  private async sendToMARP(event: TelemetryEvent) {
    const kafkaMessage = {
      topic: 'marp.telemetry.edge',
      messages: [{
        key: event.requestId,
        value: JSON.stringify({
          ...event,
          source: 'edge-gateway',
          region: process.env.REGION_CODE || 'unknown',
          instance: process.env.EDGE_INSTANCE_ID || 'unknown',
        }),
      }],
    };

    // In production: await this.kafkaClient.send(kafkaMessage);
    this.logger.debug(`Kafka telemetry message prepared for ${event.requestId}`);
  }

  /**
   * Send anomaly to MARP via Kafka
   */
  private async sendAnomalyToMARP(anomaly: AnomalyEvent) {
    const kafkaMessage = {
      topic: 'marp.anomalies.edge',
      messages: [{
        key: anomaly.requestId || `anomaly_${Date.now()}`,
        value: JSON.stringify({
          ...anomaly,
          source: 'edge-gateway',
          region: process.env.REGION_CODE || 'unknown',
          instance: process.env.EDGE_INSTANCE_ID || 'unknown',
        }),
      }],
    };

    // In production: await this.kafkaClient.send(kafkaMessage);
    this.logger.debug(`Kafka anomaly message prepared: ${anomaly.anomalyType}`);
  }

  /**
   * Get telemetry statistics for monitoring
   */
  async getTelemetryStats(hours: number = 24) {
    const query = `
      SELECT
        subsystem,
        decision,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk,
        AVG(execution_time) as avg_execution_time
      FROM edge_telemetry
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY subsystem, decision
      ORDER BY subsystem, decision
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get anomaly statistics
   */
  async getAnomalyStats(hours: number = 24) {
    const query = `
      SELECT
        anomaly_type,
        severity,
        COUNT(*) as count
      FROM edge_anomalies
      WHERE created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY anomaly_type, severity
      ORDER BY anomaly_type, severity
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
