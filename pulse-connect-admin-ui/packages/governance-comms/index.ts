// Governance Communications for Pulsco Admin Governance System
// Handles secure communication channels and notifications

import { AdminRoleType, Alert, AuditEvent } from "@pulsco/admin-shared-types";
import { AlertsClient } from "@pulsco/admin-alerts-client";
import WebSocket from "ws";
import { EventSource } from "eventsource";

export interface CommunicationChannel {
  id: string;
  type: "websocket" | "sse" | "email" | "sms" | "push";
  name: string;
  description: string;
  adminRoles: AdminRoleType[];
  priority: "low" | "normal" | "high" | "critical" | "string";
  encryption: "none" | "tls" | "end-to-end";
  status: "active" | "inactive" | "maintenance";
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationMessage {
  id: string;
  channelId: string;
  recipientRoles: AdminRoleType[];
  subject: string;
  body: string;
  priority: "low" | "normal" | "high" | "critical";
  type: "alert" | "announcement" | "escalation" | "system" | "governance";
  metadata: Record<string, any>;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  acknowledgedAt?: Date;
}

export interface CommunicationSession {
  id: string;
  adminId: string;
  adminRole: AdminRoleType;
  channelId: string;
  startedAt: Date;
  lastActivity: Date;
  status: "active" | "idle" | "disconnected";
  messagesSent: number;
  messagesReceived: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationMessage["type"];
  subjectTemplate: string;
  bodyTemplate: string;
  variables: string[];
  adminRoles: AdminRoleType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationConfig {
  apiBaseUrl: string;
  wsUrl: string;
  sseUrl: string;
  authToken: string;
  reconnectInterval: number;
  maxRetries: number;
  encryptionEnabled: boolean;
  auditEnabled: boolean;
}

export class GovernanceCommunicationsManager {
  private config: CommunicationConfig;
  private alertsClient: AlertsClient;
  private channels: Map<string, CommunicationChannel> = new Map();
  private sessions: Map<string, CommunicationSession> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private wsConnections: Map<string, WebSocket> = new Map();
  private sseConnections: Map<string, EventSource> = new Map();

  constructor(config: CommunicationConfig) {
    this.config = config;
    this.alertsClient = new AlertsClient({
      apiBaseUrl: config.apiBaseUrl,
      wsUrl: config.wsUrl,
      sseUrl: config.sseUrl,
      authToken: config.authToken,
      reconnectInterval: config.reconnectInterval,
      maxRetries: config.maxRetries
    });

    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
  }

  /**
   * Send notification through specified channel
   */
  async sendNotification(
    channelId: string,
    message: Omit<NotificationMessage, "id" | "channelId" | "sentAt">
  ): Promise<string> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Communication channel ${channelId} not found`);
    }

    if (channel.status !== "active") {
      throw new Error(`Channel ${channelId} is not active`);
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notification: NotificationMessage = {
      ...message,
      id: notificationId,
      channelId,
      sentAt: new Date()
    };

    // Send through appropriate channel
    await this.deliverNotification(channel, notification);

    // Audit the notification
    if (this.config.auditEnabled) {
      await this.auditNotification(notification);
    }

    return notificationId;
  }

  /**
   * Broadcast notification to multiple roles
   */
  async broadcastNotification(
    message: Omit<NotificationMessage, "id" | "channelId" | "sentAt" | "recipientRoles">,
    recipientRoles: AdminRoleType[],
    preferredChannel?: CommunicationChannel["type"]
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    // Group by channel type for efficiency
    const channelsByType = this.getChannelsByType();

    for (const role of recipientRoles) {
      const channelType = preferredChannel || this.getPreferredChannelForRole(role);
      const channels = channelsByType[channelType] || [];

      for (const channel of channels) {
        if (channel.adminRoles.includes(role)) {
          try {
            const notificationId = await this.sendNotification(channel.id, {
              ...message,
              recipientRoles: [role]
            });
            notificationIds.push(notificationId);
          } catch (error) {
            console.error(`Failed to send notification to ${role} via ${channel.type}:`, error);
          }
        }
      }
    }

    return notificationIds;
  }

  /**
   * Create communication session
   */
  async createSession(
    adminId: string,
    adminRole: AdminRoleType,
    channelId: string
  ): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: CommunicationSession = {
      id: sessionId,
      adminId,
      adminRole,
      channelId,
      startedAt: new Date(),
      lastActivity: new Date(),
      status: "active",
      messagesSent: 0,
      messagesReceived: 0
    };

    this.sessions.set(sessionId, session);

    // Initialize connection based on channel type
    const channel = this.channels.get(channelId);
    if (channel) {
      await this.initializeConnection(session, channel);
    }

    return sessionId;
  }

  /**
   * Send alert notification through governance channels
   */
  async notifyAlert(alert: Alert): Promise<void> {
    const escalationRoles = this.getEscalationRolesForAlert(alert);

    const message = {
      subject: `Alert: ${alert.title}`,
      body: `Severity: ${alert.severity.toUpperCase()}\n\n${alert.description}\n\nSource: ${alert.source}`,
      priority:
        alert.severity === "critical"
          ? "critical"
          : alert.severity === "high"
            ? "high"
            : alert.severity === "medium"
              ? "normal"
              : "low",
      type: "alert" as const,
      metadata: {
        alertId: alert.id,
        severity: alert.severity,
        source: alert.source
      }
    };

    await this.broadcastNotification(message, escalationRoles, "websocket");
  }

  /**
   * Send governance announcement
   */
  async sendGovernanceAnnouncement(
    subject: string,
    body: string,
    recipientRoles: AdminRoleType[] = [
      "superadmin",
      "coo",
      "business-ops",
      "people-risk",
      "procurement-partnerships",
      "legal-finance",
      "commercial-outreach",
      "tech-security",
      "customer-experience",
      "governance-registrar",
      "dpo"
    ]
  ): Promise<string[]> {
    const message = {
      subject: `Governance: ${subject}`,
      body,
      priority: "normal" as const,
      type: "governance" as const,
      metadata: {
        announcementType: "governance"
      }
    };

    return await this.broadcastNotification(message, recipientRoles, "email");
  }

  /**
   * Get communication statistics
   */
  getCommunicationStats(): {
    activeChannels: number;
    activeSessions: number;
    totalNotificationsSent: number;
    notificationsByType: Record<string, number>;
    deliverySuccessRate: number;
    averageResponseTime: number;
  } {
    const activeChannels = Array.from(this.channels.values()).filter(
      (c) => c.status === "active"
    ).length;
    const activeSessions = Array.from(this.sessions.values()).filter(
      (s) => s.status === "active"
    ).length;

    // Mock statistics - in real implementation, these would be tracked
    return {
      activeChannels,
      activeSessions,
      totalNotificationsSent: 1234,
      notificationsByType: {
        alert: 456,
        announcement: 234,
        escalation: 123,
        system: 321,
        governance: 100
      },
      deliverySuccessRate: 0.987,
      averageResponseTime: 2.3 // seconds
    };
  }

  /**
   * Get notification templates
   */
  getTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Create custom notification template
   */
  createTemplate(template: Omit<NotificationTemplate, "id" | "createdAt" | "updatedAt">): string {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullTemplate: NotificationTemplate = {
      ...template,
      id: templateId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(templateId, fullTemplate);
    return templateId;
  }

  // Private helper methods

  private initializeDefaultChannels(): void {
    const defaultChannels: CommunicationChannel[] = [
      {
        id: "ws-governance",
        type: "websocket",
        name: "Governance WebSocket",
        description: "Real-time governance communications",
        adminRoles: [
          "superadmin",
          "coo",
          "business-ops",
          "people-risk",
          "procurement-partnerships",
          "legal-finance",
          "commercial-outreach",
          "tech-security",
          "customer-experience",
          "governance-registrar",
          "dpo"
        ],
        priority: "high",
        encryption: "tls",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "sse-alerts",
        type: "sse",
        name: "Alert SSE Stream",
        description: "Server-sent events for alerts",
        adminRoles: [
          "superadmin",
          "coo",
          "business-ops",
          "people-risk",
          "procurement-partnerships",
          "legal-finance",
          "commercial-outreach",
          "tech-security",
          "customer-experience",
          "governance-registrar",
          "dpo"
        ],
        priority: "high",
        encryption: "tls",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "email-governance",
        type: "email",
        name: "Governance Email",
        description: "Secure email communications",
        adminRoles: [
          "superadmin",
          "coo",
          "business-ops",
          "people-risk",
          "procurement-partnerships",
          "legal-finance",
          "commercial-outreach",
          "tech-security",
          "customer-experience",
          "governance-registrar",
          "dpo"
        ],
        priority: "normal",
        encryption: "tls",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "sms-critical",
        type: "sms",
        name: "Critical SMS Alerts",
        description: "SMS for critical alerts only",
        adminRoles: ["superadmin", "coo", "tech-security"],
        priority: "critical",
        encryption: "tls",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultChannels.forEach((channel) => {
      this.channels.set(channel.id, channel);
    });
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: NotificationTemplate[] = [
      {
        id: "alert-template",
        name: "Alert Notification",
        type: "alert",
        subjectTemplate: "Alert: {{title}}",
        bodyTemplate:
          "Severity: {{severity}}\n\n{{description}}\n\nSource: {{source}}\n\nTime: {{timestamp}}",
        variables: ["title", "severity", "description", "source", "timestamp"],
        adminRoles: [
          "superadmin",
          "coo",
          "business-ops",
          "people-risk",
          "procurement-partnerships",
          "legal-finance",
          "commercial-outreach",
          "tech-security",
          "customer-experience",
          "governance-registrar",
          "dpo"
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "escalation-template",
        name: "Escalation Notification",
        type: "escalation",
        subjectTemplate: "ESCALATION: {{alertTitle}}",
        bodyTemplate:
          'Alert "{{alertTitle}}" has been escalated to {{targetRole}}.\n\nReason: {{reason}}\n\nPriority: {{priority}}\n\nPlease review immediately.',
        variables: ["alertTitle", "targetRole", "reason", "priority"],
        adminRoles: ["superadmin", "coo", "tech-security", "governance-registrar"],
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "governance-template",
        name: "Governance Announcement",
        type: "governance",
        subjectTemplate: "Governance: {{subject}}",
        bodyTemplate:
          "{{body}}\n\nThis is an official governance communication.\n\nPlease acknowledge receipt.",
        variables: ["subject", "body"],
        adminRoles: [
          "superadmin",
          "coo",
          "business-ops",
          "people-risk",
          "procurement-partnerships",
          "legal-finance",
          "commercial-outreach",
          "tech-security",
          "customer-experience",
          "governance-registrar",
          "dpo"
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach((template) => {
      this.templates.set(template.id, template);
    });
  }

  private async deliverNotification(
    channel: CommunicationChannel,
    notification: NotificationMessage
  ): Promise<void> {
    switch (channel.type) {
      case "websocket":
        await this.deliverViaWebSocket(channel, notification);
        break;
      case "sse":
        await this.deliverViaSSE(channel, notification);
        break;
      case "email":
        await this.deliverViaEmail(channel, notification);
        break;
      case "sms":
        await this.deliverViaSMS(channel, notification);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  private async deliverViaWebSocket(
    channel: CommunicationChannel,
    notification: NotificationMessage
  ): Promise<void> {
    // In a real implementation, this would send via WebSocket
    console.log(`Delivering notification via WebSocket: ${notification.subject}`);
  }

  private async deliverViaSSE(
    channel: CommunicationChannel,
    notification: NotificationMessage
  ): Promise<void> {
    // In a real implementation, this would send via SSE
    console.log(`Delivering notification via SSE: ${notification.subject}`);
  }

  private async deliverViaEmail(
    channel: CommunicationChannel,
    notification: NotificationMessage
  ): Promise<void> {
    // In a real implementation, this would send email
    console.log(`Delivering notification via Email: ${notification.subject}`);
  }

  private async deliverViaSMS(
    channel: CommunicationChannel,
    notification: NotificationMessage
  ): Promise<void> {
    // In a real implementation, this would send SMS
    console.log(`Delivering notification via SMS: ${notification.subject}`);
  }

  private async auditNotification(notification: NotificationMessage): Promise<void> {
    const auditEvent: Partial<AuditEvent> = {
      type: "admin-login", // Would be 'notification-sent' in real implementation
      adminEmail: "system@governance.pulsco.global",
      adminRole: "superadmin",
      action: "notification-sent",
      result: "success",
      reason: `Notification sent via ${notification.channelId}`,
      deviceFingerprint: "system",
      timestamp: new Date(),
      hashChain: `audit_${Date.now()}`
    };

    // In real implementation, send to audit service
    console.log("Audited notification:", auditEvent);
  }

  private getChannelsByType(): Record<CommunicationChannel["type"], CommunicationChannel[]> {
    const channelsByType: Record<string, CommunicationChannel[]> = {};

    for (const channel of this.channels.values()) {
      if (!channelsByType[channel.type]) {
        channelsByType[channel.type] = [];
      }
      channelsByType[channel.type].push(channel);
    }

    return channelsByType;
  }

  private getPreferredChannelForRole(role: AdminRoleType): CommunicationChannel["type"] {
    // Define preferences based on role criticality
    const criticalRoles: AdminRoleType[] = ["superadmin", "coo", "tech-security"];
    const highPriorityRoles: AdminRoleType[] = [
      "business-ops",
      "people-risk",
      "legal-finance",
      "dpo"
    ];

    if (criticalRoles.includes(role)) {
      return "websocket";
    } else if (highPriorityRoles.includes(role)) {
      return "sse";
    } else {
      return "email";
    }
  }

  private getEscalationRolesForAlert(alert: Alert): AdminRoleType[] {
    // Determine which roles should receive this alert based on type and severity
    const baseRoles: AdminRoleType[] = ["superadmin"];

    if (alert.severity === "critical") {
      return ["superadmin", "coo", "tech-security"];
    } else if (alert.severity === "high") {
      return ["superadmin", "coo"];
    } else if (alert.severity === "medium") {
      return ["superadmin", "coo", "business-ops"];
    } else {
      return baseRoles;
    }
  }

  private async initializeConnection(
    session: CommunicationSession,
    channel: CommunicationChannel
  ): Promise<void> {
    // Initialize connection based on channel type
    if (channel.type === "websocket") {
      // WebSocket connection logic
    } else if (channel.type === "sse") {
      // SSE connection logic
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Close all WebSocket connections
    for (const ws of this.wsConnections.values()) {
      ws.close();
    }
    this.wsConnections.clear();

    // Close all SSE connections
    for (const sse of this.sseConnections.values()) {
      sse.close();
    }
    this.sseConnections.clear();

    // Clear sessions
    this.sessions.clear();
  }
}

export default GovernanceCommunicationsManager;
