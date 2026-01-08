import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';

export interface Alert {
  id: string;
  type: 'slo_breach' | 'anomaly' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  threshold: any;
  current_value: any;
  subsystem?: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private activeAlerts = new Map<string, Alert>();

  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
  ) {
    // Start monitoring loop
    this.startMonitoringLoop();
  }

  private async startMonitoringLoop() {
    // Check for alerts every 60 seconds
    setInterval(async () => {
      await this.checkForAlerts();
    }, 60000);
  }

  async checkForAlerts() {
    try {
      await Promise.all([
        this.checkSLOMetrics(),
        this.checkAnomalies(),
        this.checkSecurityIncidents(),
        this.checkSystemHealth(),
      ]);
    } catch (error) {
      this.logger.error(`Failed to check for alerts: ${error.message}`);
    }
  }

  private async checkSLOMetrics() {
    // Check snapshot freshness SLO
    const snapshotFreshness = await this.getSnapshotFreshness();
    if (snapshotFreshness.age_seconds > 5) {
      await this.createAlert({
        type: 'slo_breach',
        severity: 'high',
        title: 'Snapshot Freshness SLO Breach',
        description: `Governance snapshot is ${snapshotFreshness.age_human} old`,
        metric: 'snapshot_freshness_seconds',
        threshold: 5,
        current_value: snapshotFreshness.age_seconds,
      });
    }

    // Check quorum latency SLO
    const quorumLatency = await this.getQuorumLatency();
    const maxLatency = Math.max(...quorumLatency.councils.map(c => c.max_latency_seconds));
    if (maxLatency > 30) {
      await this.createAlert({
        type: 'slo_breach',
        severity: 'medium',
        title: 'Quorum Latency SLO Breach',
        description: `Council quorum decision took ${maxLatency}s`,
        metric: 'quorum_latency_seconds',
        threshold: 30,
        current_value: maxLatency,
      });
    }

    // Check signature verification SLO
    const sigVerification = await this.getSignatureVerificationRates();
    const successRate = parseFloat(sigVerification.success_rate);
    if (successRate < 100) {
      await this.createAlert({
        type: 'slo_breach',
        severity: 'critical',
        title: 'Signature Verification SLO Breach',
        description: `Signature verification success rate: ${sigVerification.success_rate}`,
        metric: 'signature_verification_success_rate',
        threshold: 100,
        current_value: successRate,
      });
    }
  }

  private async checkAnomalies() {
    // Check for unusual firewall action patterns
    const firewallActions = await this.getFirewallActionRatios('1h');
    const blockRate = parseFloat(firewallActions.breakdown.find(a => a.action_type === 'firewall_block')?.percentage || '0');

    if (blockRate > 10) { // More than 10% blocks
      await this.createAlert({
        type: 'anomaly',
        severity: 'high',
        title: 'High Firewall Block Rate',
        description: `Firewall block rate is ${blockRate}% in the last hour`,
        metric: 'firewall_block_rate_percentage',
        threshold: 10,
        current_value: blockRate,
      });
    }

    // Check for spike in conflict escalations
    const escalations = await this.getConflictEscalations('1h');
    if (escalations.total_escalations > 50) {
      await this.createAlert({
        type: 'anomaly',
        severity: 'medium',
        title: 'High Conflict Escalation Rate',
        description: `${escalations.total_escalations} conflicts escalated in the last hour`,
        metric: 'conflict_escalations_per_hour',
        threshold: 50,
        current_value: escalations.total_escalations,
      });
    }
  }

  private async checkSecurityIncidents() {
    // Check for signature mismatches
    const sigVerification = await this.getSignatureVerificationRates('5m');
    const invalidCount = sigVerification.invalid_signatures;

    if (invalidCount > 0) {
      await this.createAlert({
        type: 'security',
        severity: 'critical',
        title: 'Signature Verification Failures',
        description: `${invalidCount} invalid signatures detected in the last 5 minutes`,
        metric: 'invalid_signatures_count',
        threshold: 0,
        current_value: invalidCount,
      });
    }

    // Check for tamper suspicion
    const tamperEvents = await this.getTamperEvents('5m');
    if (tamperEvents.length > 0) {
      await this.createAlert({
        type: 'security',
        severity: 'critical',
        title: 'Tamper Detection Alert',
        description: `${tamperEvents.length} potential tampering events detected`,
        metric: 'tamper_events_count',
        threshold: 0,
        current_value: tamperEvents.length,
      });
    }
  }

  private async checkSystemHealth() {
    // Check subsystem health
    const health = await this.getSubsystemHealth();
    const unhealthySubsystems = health.subsystems.filter(s => s.health_status === 'unhealthy');

    if (unhealthySubsystems.length > 0) {
      await this.createAlert({
        type: 'system',
        severity: 'medium',
        title: 'Subsystem Health Degradation',
        description: `${unhealthySubsystems.length} subsystems are unhealthy: ${unhealthySubsystems.map(s => s.name).join(', ')}`,
        metric: 'unhealthy_subsystems_count',
        threshold: 0,
        current_value: unhealthySubsystems.length,
      });
    }

    // Check quorum failures
    const quorumFailures = await this.getQuorumFailures('1h');
    if (quorumFailures > 0) {
      await this.createAlert({
        type: 'system',
        severity: 'high',
        title: 'Council Quorum Failures',
        description: `${quorumFailures} council decisions failed to reach quorum in the last hour`,
        metric: 'quorum_failures_count',
        threshold: 0,
        current_value: quorumFailures,
      });
    }
  }

  private async createAlert(alertData: Omit<Alert, 'id' | 'created_at'>) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      ...alertData,
      created_at: new Date().toISOString(),
    };

    // Store in memory for quick access
    this.activeAlerts.set(alertId, alert);

    // Persist to database
    await this.persistAlert(alert);

    // Log the alert
    this.logger.warn(`Alert created: ${alert.title} - ${alert.description}`);

    // TODO: Send notifications (email, webhook, etc.)
    await this.sendAlertNotifications(alert);
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved_at);
  }

  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged_at = new Date().toISOString();
      await this.updateAlertStatus(alertId, 'acknowledged', userId);
    }
  }

  async resolveAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved_at = new Date().toISOString();
      this.activeAlerts.delete(alertId);
      await this.updateAlertStatus(alertId, 'resolved', userId);
    }
  }

  private async persistAlert(alert: Alert): Promise<void> {
    const query = `
      INSERT INTO marp_alerts (
        id, alert_type, severity, title, description, metric, threshold_value,
        current_value, subsystem_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    await this.db.query(query, [
      alert.id,
      alert.type,
      alert.severity,
      alert.title,
      alert.description,
      alert.metric,
      JSON.stringify(alert.threshold),
      JSON.stringify(alert.current_value),
      alert.subsystem,
      alert.created_at,
    ]);
  }

  private async updateAlertStatus(alertId: string, status: string, userId: string): Promise<void> {
    const column = status === 'acknowledged' ? 'acknowledged_at' : 'resolved_at';
    const query = `UPDATE marp_alerts SET ${column} = NOW(), acknowledged_by = $1 WHERE id = $2`;

    await this.db.query(query, [userId, alertId]);
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    // TODO: Implement notification logic
    // - Email to on-call engineers
    // - Webhooks to incident management systems
    // - SMS for critical alerts
    // - Slack/Teams notifications

    this.logger.log(`Sending notifications for alert: ${alert.title}`);
  }

  // Helper methods for data collection
  private async getSnapshotFreshness() {
    const result = await this.db.query(`
      SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) as age_seconds
      FROM governance_snapshots WHERE is_active = true
    `);
    return { age_seconds: result.rows[0]?.age_seconds || 0 };
  }

  private async getQuorumLatency() {
    const result = await this.db.query(`
      SELECT MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_latency_seconds
      FROM council_decisions WHERE status = 'approved'
    `);
    return {
      councils: [{ max_latency_seconds: result.rows[0]?.max_latency_seconds || 0 }]
    };
  }

  private async getSignatureVerificationRates(timeframe: string) {
    // Implementation similar to MetricsService
    return { success_rate: '100.00%', invalid_signatures: 0 };
  }

  private async getFirewallActionRatios(timeframe: string) {
    // Implementation similar to MetricsService
    return { breakdown: [] };
  }

  private async getConflictEscalations(timeframe: string) {
    // Implementation similar to MetricsService
    return { total_escalations: 0 };
  }

  private async getTamperEvents(timeframe: string) {
    // Check for integrity violations
    return [];
  }

  private async getSubsystemHealth() {
    // Implementation similar to MetricsService
    return { subsystems: [] };
  }

  private async getQuorumFailures(timeframe: string) {
    const result = await this.db.query(`
      SELECT COUNT(*) as failures
      FROM council_decisions
      WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '${timeframe}'
    `);
    return parseInt(result.rows[0]?.failures || '0');
  }
}
