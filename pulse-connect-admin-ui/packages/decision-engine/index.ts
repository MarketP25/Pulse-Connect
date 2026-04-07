// Decision Engine for Pulsco Admin Governance System
// Handles acknowledgements, response logging, escalation rules, and resolution status

import { AdminRoleType, Alert, EscalationRule } from "@pulsco/admin-shared-types";
import { AlertsClient, AlertAcknowledgement, AlertEscalation } from "@pulsco/admin-alerts-client";

export interface Acknowledgement {
  id: string;
  alertId: string;
  adminId: string;
  adminRole: AdminRoleType;
  comment?: string;
  acknowledgedAt: Date;
  autoAcknowledged: boolean;
  responseTime: number; // minutes from alert creation
}

export interface ResponseLog {
  id: string;
  alertId: string;
  adminId: string;
  adminRole: AdminRoleType;
  action: "acknowledged" | "escalated" | "resolved" | "commented" | "ignored";
  timestamp: Date;
  details: Record<string, any>;
  auditTrail: string;
}

export interface EscalationStatus {
  alertId: string;
  currentLevel: AdminRoleType;
  escalationHistory: EscalationRecord[];
  nextEscalationTime?: Date;
  autoEscalationEnabled: boolean;
  silenced: boolean;
  silencedUntil?: Date;
}

export interface EscalationRecord {
  id: string;
  fromRole: AdminRoleType;
  toRole: AdminRoleType;
  reason: string;
  escalatedAt: Date;
  escalatedBy: AdminRoleType;
  priority: "normal" | "urgent" | "critical";
}

export interface ResolutionStatus {
  alertId: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: AdminRoleType;
  resolution: string;
  effectiveness: "successful" | "partial" | "unsuccessful" | "pending-review";
  lessonsLearned?: string;
  preventionMeasures?: string[];
}

export interface DecisionEngineConfig {
  apiBaseUrl: string;
  authToken: string;
  autoEscalationEnabled: boolean;
  defaultEscalationTimeout: number; // minutes
  maxEscalationLevels: number;
}

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private alertsClient: AlertsClient;
  private acknowledgements: Map<string, Acknowledgement> = new Map();
  private responseLogs: Map<string, ResponseLog[]> = new Map();
  private escalationStatuses: Map<string, EscalationStatus> = new Map();
  private resolutionStatuses: Map<string, ResolutionStatus> = new Map();

  constructor(config: DecisionEngineConfig) {
    this.config = config;
    this.alertsClient = new AlertsClient({
      apiBaseUrl: config.apiBaseUrl,
      wsUrl: `ws://${new URL(config.apiBaseUrl).host}`,
      sseUrl: config.apiBaseUrl.replace("http", "http"),
      authToken: config.authToken,
      reconnectInterval: 5000,
      maxRetries: 3
    });

    this.setupEventListeners();
  }

  /**
   * Acknowledge an alert with tracking
   */
  async acknowledgeAlert(
    alertId: string,
    adminId: string,
    adminRole: AdminRoleType,
    comment?: string,
    autoAcknowledged: boolean = false
  ): Promise<boolean> {
    try {
      // Create acknowledgement record
      const acknowledgement: Acknowledgement = {
        id: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        alertId,
        adminId,
        adminRole,
        comment,
        acknowledgedAt: new Date(),
        autoAcknowledged,
        responseTime: this.calculateResponseTime(alertId)
      };

      // Store locally
      this.acknowledgements.set(alertId, acknowledgement);

      // Log the response
      await this.logResponse(alertId, adminId, adminRole, "acknowledged", {
        comment,
        autoAcknowledged,
        responseTime: acknowledgement.responseTime
      });

      // Send to alerts client
      const success = await this.alertsClient.acknowledgeAlert({
        alertId,
        adminId,
        adminRole,
        comment,
        timestamp: acknowledgement.acknowledgedAt
      });

      if (success) {
        // Update escalation status
        const escalationStatus = this.escalationStatuses.get(alertId);
        if (escalationStatus) {
          escalationStatus.silenced = true;
          escalationStatus.silencedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        }
      }

      return success;
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      return false;
    }
  }

  /**
   * Escalate an alert with full tracking
   */
  async escalateAlert(
    alertId: string,
    fromRole: AdminRoleType,
    toRole: AdminRoleType,
    reason: string,
    escalatedBy: AdminRoleType,
    priority: "normal" | "urgent" | "critical" = "normal"
  ): Promise<boolean> {
    try {
      // Create escalation record
      const escalationRecord: EscalationRecord = {
        id: `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromRole,
        toRole,
        reason,
        escalatedAt: new Date(),
        escalatedBy,
        priority
      };

      // Update escalation status
      let escalationStatus = this.escalationStatuses.get(alertId);
      if (!escalationStatus) {
        escalationStatus = {
          alertId,
          currentLevel: fromRole,
          escalationHistory: [],
          autoEscalationEnabled: this.config.autoEscalationEnabled,
          silenced: false
        };
        this.escalationStatuses.set(alertId, escalationStatus);
      }

      escalationStatus.escalationHistory.push(escalationRecord);
      escalationStatus.currentLevel = toRole;

      // Log the escalation
      await this.logResponse(alertId, escalatedBy, escalatedBy, "escalated", {
        toRole,
        reason,
        priority
      });

      // Send to alerts client
      const success = await this.alertsClient.escalateAlert({
        alertId,
        fromRole,
        toRole,
        reason,
        priority,
        timestamp: escalationRecord.escalatedAt
      });

      return success;
    } catch (error) {
      console.error("Failed to escalate alert:", error);
      return false;
    }
  }

  /**
   * Resolve an alert with status tracking
   */
  async resolveAlert(
    alertId: string,
    adminId: string,
    adminRole: AdminRoleType,
    resolution: string,
    effectiveness: ResolutionStatus["effectiveness"] = "successful",
    lessonsLearned?: string,
    preventionMeasures?: string[]
  ): Promise<boolean> {
    try {
      // Create resolution status
      const resolutionStatus: ResolutionStatus = {
        alertId,
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: adminRole,
        resolution,
        effectiveness,
        lessonsLearned,
        preventionMeasures
      };

      // Store locally
      this.resolutionStatuses.set(alertId, resolutionStatus);

      // Log the resolution
      await this.logResponse(alertId, adminId, adminRole, "resolved", {
        resolution,
        effectiveness,
        lessonsLearned,
        preventionMeasures
      });

      // Send to alerts client
      const success = await this.alertsClient.resolveAlert(alertId, adminId, adminRole, resolution);

      if (success) {
        // Clean up escalation status
        this.escalationStatuses.delete(alertId);
      }

      return success;
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      return false;
    }
  }

  /**
   * Log a response action
   */
  private async logResponse(
    alertId: string,
    adminId: string,
    adminRole: AdminRoleType,
    action: ResponseLog["action"],
    details: Record<string, any>
  ): Promise<void> {
    const responseLog: ResponseLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertId,
      adminId,
      adminRole,
      action,
      timestamp: new Date(),
      details,
      auditTrail: this.generateAuditTrail(adminId, action, details)
    };

    // Store locally
    const logs = this.responseLogs.get(alertId) || [];
    logs.push(responseLog);
    this.responseLogs.set(alertId, logs);

    // In a real implementation, this would be sent to a logging service
    console.log("Response logged:", responseLog);
  }

  /**
   * Get acknowledgements for an alert
   */
  getAcknowledgements(alertId: string): Acknowledgement | undefined {
    return this.acknowledgements.get(alertId);
  }

  /**
   * Get response logs for an alert
   */
  getResponseLogs(alertId: string): ResponseLog[] {
    return this.responseLogs.get(alertId) || [];
  }

  /**
   * Get escalation status for an alert
   */
  getEscalationStatus(alertId: string): EscalationStatus | undefined {
    return this.escalationStatuses.get(alertId);
  }

  /**
   * Get resolution status for an alert
   */
  getResolutionStatus(alertId: string): ResolutionStatus | undefined {
    return this.resolutionStatuses.get(alertId);
  }

  /**
   * Check if an alert should be auto-escalated
   */
  shouldAutoEscalate(alertId: string): boolean {
    const escalationStatus = this.escalationStatuses.get(alertId);
    if (!escalationStatus || !escalationStatus.autoEscalationEnabled) {
      return false;
    }

    const acknowledgement = this.acknowledgements.get(alertId);
    if (!acknowledgement) {
      // Check if alert is past escalation timeout
      // This would need alert creation time - simplified for demo
      return escalationStatus.escalationHistory.length < this.config.maxEscalationLevels;
    }

    return false;
  }

  /**
   * Get escalation rules for an admin role
   */
  static getEscalationRules(adminRole: AdminRoleType): EscalationRule[] {
    const escalationMatrix: Record<AdminRoleType, EscalationRule[]> = {
      superadmin: [], // Cannot escalate further
      coo: [
        {
          id: "coo-to-superadmin",
          condition: "unacknowledged_critical_alert",
          targetRole: "superadmin",
          timeoutMinutes: 15,
          action: "escalate"
        }
      ],
      "business-ops": [
        {
          id: "business-ops-to-coo",
          condition: "revenue_threshold_breach",
          targetRole: "coo",
          timeoutMinutes: 30,
          action: "escalate"
        }
      ],
      "people-risk": [
        {
          id: "people-risk-to-legal-finance",
          condition: "compliance_violation",
          targetRole: "legal-finance",
          timeoutMinutes: 60,
          action: "escalate"
        }
      ],
      "procurement-partnerships": [
        {
          id: "procurement-to-coo",
          condition: "vendor_sla_breach",
          targetRole: "coo",
          timeoutMinutes: 45,
          action: "escalate"
        }
      ],
      "legal-finance": [
        {
          id: "legal-to-superadmin",
          condition: "regulatory_violation",
          targetRole: "superadmin",
          timeoutMinutes: 30,
          action: "escalate"
        }
      ],
      "commercial-outreach": [
        {
          id: "commercial-to-business-ops",
          condition: "market_share_decline",
          targetRole: "business-ops",
          timeoutMinutes: 60,
          action: "escalate"
        }
      ],
      dpo: [
        {
          id: "dpo-to-governance-registrar and people-risk",
          condition: "data_breach_and_policy_violations",
          targetRole: "governance-registrar, people-risk",
          timeoutMinutes: 60,
          action: "escalate"
        }
      ],
      "tech-security": [
        {
          id: "tech-to-superadmin",
          condition: "security_breach",
          targetRole: "superadmin",
          timeoutMinutes: 10,
          action: "escalate"
        }
      ],
      "customer-experience": [
        {
          id: "customer-to-commercial",
          condition: "satisfaction_critical_drop",
          targetRole: "commercial-outreach",
          timeoutMinutes: 45,
          action: "escalate"
        }
      ],
      "governance-registrar": [
        {
          id: "governance-to-superadmin",
          condition: "audit_failure",
          targetRole: "superadmin",
          timeoutMinutes: 60,
          action: "escalate"
        }
      ]
    };

    return escalationMatrix[adminRole] || [];
  }

  /**
   * Setup event listeners for alerts
   */
  private setupEventListeners(): void {
    this.alertsClient.onAlert((alert) => {
      // Initialize escalation status for new alerts
      if (!this.escalationStatuses.has(alert.id)) {
        const escalationRules = AlertsClient.getEscalationRules(alert.type, alert.severity);
        const escalationStatus: EscalationStatus = {
          alertId: alert.id,
          currentLevel: escalationRules.targetRole,
          escalationHistory: [],
          autoEscalationEnabled: this.config.autoEscalationEnabled,
          silenced: false
        };
        this.escalationStatuses.set(alert.id, escalationStatus);

        // Set up auto-escalation timer
        if (this.config.autoEscalationEnabled) {
          setTimeout(
            () => {
              if (this.shouldAutoEscalate(alert.id)) {
                this.escalateAlert(
                  alert.id,
                  escalationStatus.currentLevel,
                  escalationRules.targetRole,
                  "Auto-escalation due to timeout",
                  escalationStatus.currentLevel,
                  "urgent"
                );
              }
            },
            escalationRules.timeoutMinutes * 60 * 1000
          );
        }
      }
    });

    this.alertsClient.onAcknowledgement((ack) => {
      // Handle acknowledgement events
      console.log("Alert acknowledged:", ack);
    });

    this.alertsClient.onEscalation((esc) => {
      // Handle escalation events
      console.log("Alert escalated:", esc);
    });
  }

  /**
   * Calculate response time for an alert
   */
  private calculateResponseTime(alertId: string): number {
    // In a real implementation, this would get the alert creation time
    // For demo purposes, return a mock response time
    return Math.floor(Math.random() * 60) + 1; // 1-60 minutes
  }

  /**
   * Generate audit trail for logging
   */
  private generateAuditTrail(
    adminId: string,
    action: string,
    details: Record<string, any>
  ): string {
    return `Admin ${adminId} performed ${action} at ${new Date().toISOString()} with details: ${JSON.stringify(details)}`;
  }

  /**
   * Get decision engine statistics
   */
  getStats(): {
    totalAcknowledgements: number;
    totalEscalations: number;
    totalResolutions: number;
    averageResponseTime: number;
    escalationRate: number;
  } {
    const totalAcknowledgements = this.acknowledgements.size;
    const totalEscalations = Array.from(this.escalationStatuses.values()).reduce(
      (sum, status) => sum + status.escalationHistory.length,
      0
    );
    const totalResolutions = Array.from(this.resolutionStatuses.values()).filter(
      (status) => status.resolved
    ).length;

    const responseTimes = Array.from(this.acknowledgements.values()).map((ack) => ack.responseTime);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const escalationRate = totalAcknowledgements > 0 ? totalEscalations / totalAcknowledgements : 0;

    return {
      totalAcknowledgements,
      totalEscalations,
      totalResolutions,
      averageResponseTime,
      escalationRate
    };
  }
}

export default DecisionEngine;
