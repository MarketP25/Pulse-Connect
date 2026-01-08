import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { MetricsService } from './metrics.service';
import { AlertingService } from './alerting.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('DATABASE_CONNECTION') private readonly db: Pool,
    private readonly metricsService: MetricsService,
    private readonly alertingService: AlertingService,
  ) {}

  async getDashboardOverview() {
    const [
      sloStatus,
      activeAlerts,
      subsystemHealth,
      recentActivity
    ] = await Promise.all([
      this.getSLOStatus(),
      this.alertingService.getActiveAlerts(),
      this.metricsService.getSubsystemHealth(),
      this.getRecentActivity()
    ]);

    return {
      timestamp: new Date().toISOString(),
      slo_status: sloStatus,
      active_alerts: {
        count: activeAlerts.length,
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length,
      },
      subsystem_health: subsystemHealth,
      recent_activity: recentActivity,
    };
  }

  async getSLOStatus() {
    const [
      snapshotFreshness,
      quorumLatency,
      signatureVerification
    ] = await Promise.all([
      this.metricsService.getSnapshotFreshness(),
      this.metricsService.getQuorumLatency(),
      this.metricsService.getSignatureVerificationRates()
    ]);

    return {
      snapshot_distribution: {
        current: snapshotFreshness.age_seconds,
        target: 5, // seconds
        status: snapshotFreshness.age_seconds <= 5 ? 'healthy' : 'breached',
        slo: 'Snapshot distribution < 5s'
      },
      policy_validation: {
        current: quorumLatency.councils[0]?.avg_latency_seconds || 0,
        target: 500, // milliseconds
        status: (quorumLatency.councils[0]?.avg_latency_seconds || 0) <= 0.5 ? 'healthy' : 'breached',
        slo: 'Policy validation p95 < 500ms'
      },
      audit_completeness: {
        current: parseFloat(signatureVerification.success_rate),
        target: 100, // percentage
        status: parseFloat(signatureVerification.success_rate) >= 100 ? 'healthy' : 'breached',
        slo: 'Audit completeness 100%'
      }
    };
  }

  async getAlertsSummary(timeframe: string) {
    const alerts = await this.alertingService.getActiveAlerts();

    // Group by type and severity
    const summary = {
      total: alerts.length,
      by_type: {} as Record<string, number>,
      by_severity: {} as Record<string, number>,
      recent_trends: await this.getAlertTrends(timeframe),
    };

    alerts.forEach(alert => {
      summary.by_type[alert.type] = (summary.by_type[alert.type] || 0) + 1;
      summary.by_severity[alert.severity] = (summary.by_severity[alert.severity] || 0) + 1;
    });

    return summary;
  }

  async getSubsystemStatus() {
    const health = await this.metricsService.getSubsystemHealth();

    return {
      overall_health: this.calculateOverallHealth(health.subsystems),
      subsystems: health.subsystems.map(subsystem => ({
        name: subsystem.name,
        status: subsystem.health_status,
        last_heartbeat: subsystem.last_heartbeat,
        uptime_percentage: subsystem.uptime_percentage,
        active_rules: subsystem.active_rules_count,
        recent_activity: subsystem.recent_activity_count,
      })),
      planetary_coverage: this.calculatePlanetaryCoverage(health.subsystems),
    };
  }

  async getCouncilActivity(timeframe: string) {
    const result = await this.db.query(`
      SELECT
        c.council_type,
        COUNT(cd.id) as total_decisions,
        COUNT(CASE WHEN cd.status = 'approved' THEN 1 END) as approved_decisions,
        COUNT(CASE WHEN cd.status = 'rejected' THEN 1 END) as rejected_decisions,
        AVG(EXTRACT(EPOCH FROM (cd.updated_at - cd.created_at))) as avg_decision_time_seconds,
        MAX(EXTRACT(EPOCH FROM (cd.updated_at - cd.created_at))) as max_decision_time_seconds
      FROM councils c
      LEFT JOIN council_decisions cd ON c.id = cd.council_id
        AND cd.created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY c.council_type
    `);

    return {
      timeframe,
      councils: result.rows.map(row => ({
        council_type: row.council_type,
        total_decisions: parseInt(row.total_decisions),
        approved_decisions: parseInt(row.approved_decisions),
        rejected_decisions: parseInt(row.rejected_decisions),
        approval_rate: row.total_decisions > 0 ?
          (parseInt(row.approved_decisions) / parseInt(row.total_decisions) * 100).toFixed(2) : '0.00',
        avg_decision_time_seconds: parseFloat(row.avg_decision_time_seconds || 0),
        max_decision_time_seconds: parseFloat(row.max_decision_time_seconds || 0),
      })),
    };
  }

  async getFirewallActivity(timeframe: string) {
    const actions = await this.metricsService.getFirewallActionRatios(timeframe);

    return {
      timeframe,
      total_actions: actions.total_actions,
      breakdown: actions.breakdown.map(item => ({
        action_type: item.action_type,
        count: item.count,
        percentage: item.percentage,
        trend: item.trend,
      })),
      top_blocked_subsystems: await this.getTopBlockedSubsystems(timeframe),
      geographic_distribution: await this.getGeographicFirewallActivity(timeframe),
    };
  }

  async getUserProtectionMetrics(timeframe: string) {
    const result = await this.db.query(`
      SELECT
        COUNT(DISTINCT user_id) as total_protected_users,
        AVG(risk_score) as avg_risk_score,
        COUNT(CASE WHEN protection_level = 'maximum' THEN 1 END) as maximum_protection_users,
        COUNT(CASE WHEN protection_level = 'enhanced' THEN 1 END) as enhanced_protection_users,
        COUNT(CASE WHEN protection_level = 'standard' THEN 1 END) as standard_protection_users,
        COUNT(CASE WHEN quarantine_status = 'active' THEN 1 END) as quarantined_users
      FROM user_protection_status
      WHERE last_assessment >= NOW() - INTERVAL '${timeframe}'
    `);

    const fraudAlerts = await this.db.query(`
      SELECT
        COUNT(*) as total_alerts,
        COUNT(CASE WHEN risk_level = 'critical' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN risk_level = 'high' THEN 1 END) as high_alerts,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) / 3600 as avg_response_time_hours
      FROM marp_audit
      WHERE action_type = 'fraud_alert'
        AND created_at >= NOW() - INTERVAL '${timeframe}'
    `);

    return {
      timeframe,
      user_protection: result.rows[0] ? {
        total_protected_users: parseInt(result.rows[0].total_protected_users),
        avg_risk_score: parseFloat(result.rows[0].avg_risk_score || 0),
        protection_distribution: {
          maximum: parseInt(result.rows[0].maximum_protection_users),
          enhanced: parseInt(result.rows[0].enhanced_protection_users),
          standard: parseInt(result.rows[0].standard_protection_users),
        },
        quarantined_users: parseInt(result.rows[0].quarantined_users),
      } : null,
      fraud_detection: fraudAlerts.rows[0] ? {
        total_alerts: parseInt(fraudAlerts.rows[0].total_alerts),
        critical_alerts: parseInt(fraudAlerts.rows[0].critical_alerts),
        high_alerts: parseInt(fraudAlerts.rows[0].high_alerts),
        avg_response_time_hours: parseFloat(fraudAlerts.rows[0].avg_response_time_hours || 0),
      } : null,
    };
  }

  private async getRecentActivity() {
    const result = await this.db.query(`
      SELECT
        action_type,
        entity_type,
        COUNT(*) as count,
        MAX(created_at) as latest_activity
      FROM marp_audit
      WHERE created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY action_type, entity_type
      ORDER BY latest_activity DESC
      LIMIT 10
    `);

    return result.rows.map(row => ({
      action_type: row.action_type,
      entity_type: row.entity_type,
      count: parseInt(row.count),
      latest_activity: row.latest_activity.toISOString(),
    }));
  }

  private async getAlertTrends(timeframe: string) {
    // Simplified trend calculation
    return {
      increasing: false,
      change_percentage: 0,
      period: timeframe,
    };
  }

  private calculateOverallHealth(subsystems: any[]) {
    if (subsystems.length === 0) return 'unknown';

    const healthy = subsystems.filter(s => s.health_status === 'healthy').length;
    const percentage = (healthy / subsystems.length) * 100;

    if (percentage >= 95) return 'excellent';
    if (percentage >= 85) return 'good';
    if (percentage >= 70) return 'fair';
    return 'poor';
  }

  private calculatePlanetaryCoverage(subsystems: any[]) {
    // Calculate coverage across different planetary regions
    const regions = ['americas', 'europe', 'asia', 'oceania', 'africa'];
    const coverage = regions.map(region => ({
      region,
      active_subsystems: subsystems.filter(s => s.region === region && s.health_status === 'healthy').length,
      total_subsystems: subsystems.filter(s => s.region === region).length,
    }));

    return {
      regions: coverage,
      global_coverage_percentage: coverage.reduce((sum, r) => sum + (r.active_subsystems / r.total_subsystems * 100), 0) / coverage.length,
    };
  }

  private async getTopBlockedSubsystems(timeframe: string) {
    // Implementation for top blocked subsystems
    return [];
  }

  private async getGeographicFirewallActivity(timeframe: string) {
    // Implementation for geographic distribution
    return {};
  }
}
