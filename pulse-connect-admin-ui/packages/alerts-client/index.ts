// Alerts Client for Pulsco Admin Governance System
// Handles alert generation, acknowledgement, escalation, and real-time notifications

import { Alert, AdminRoleType } from '@pulsco/admin-shared-types';
import WebSocket from 'ws';
import { EventSource } from 'eventsource';

export interface AlertFilter {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: 'csi-anomaly' | 'threshold-breach' | 'policy-violation' | 'system-degraded';
  acknowledged?: boolean;
  resolved?: boolean;
  targetRoles?: AdminRoleType[];
  startDate?: Date;
  endDate?: Date;
}

export interface AlertAcknowledgement {
  alertId: string;
  adminId: string;
  adminRole: AdminRoleType;
  comment?: string;
  timestamp: Date;
}

export interface AlertEscalation {
  alertId: string;
  fromRole: AdminRoleType;
  toRole: AdminRoleType;
  reason: string;
  priority: 'normal' | 'urgent' | 'critical';
  timestamp: Date;
}

export interface AlertsClientConfig {
  apiBaseUrl: string;
  wsUrl: string;
  sseUrl: string;
  authToken: string;
  reconnectInterval: number;
  maxRetries: number;
}

export class AlertsClient {
  private config: AlertsClientConfig;
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private alertListeners: ((alert: Alert) => void)[] = [];
  private acknowledgementListeners: ((ack: AlertAcknowledgement) => void)[] = [];
  private escalationListeners: ((esc: AlertEscalation) => void)[] = [];

  constructor(config: AlertsClientConfig) {
    this.config = config;
  }

  /**
   * Fetch alerts with filtering and pagination
   */
  async fetchAlerts(
    filters?: AlertFilter,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    alerts: Alert[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (value instanceof Date) {
              queryParams.set(key, value.toISOString());
            } else if (Array.isArray(value)) {
              queryParams.set(key, value.join(','));
            } else {
              queryParams.set(key, value.toString());
            }
          }
        });
      }

      const response = await fetch(`${this.config.apiBaseUrl}/alerts?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Alerts API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        alerts: data.alerts.map((alert: any) => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          source: alert.source,
          targetRoles: alert.targetRoles,
          acknowledged: alert.acknowledged,
          acknowledgedBy: alert.acknowledgedBy,
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
          resolved: alert.resolved,
          resolvedBy: alert.resolvedBy,
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
          createdAt: new Date(alert.createdAt),
          metadata: alert.metadata
        })),
        total: data.total,
        page: data.page,
        limit: data.limit
      };
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      return {
        alerts: [],
        total: 0,
        page,
        limit
      };
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(acknowledgement: AlertAcknowledgement): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/alerts/${acknowledgement.alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(acknowledgement)
      });

      if (!response.ok) {
        throw new Error(`Acknowledge API error: ${response.status}`);
      }

      // Notify listeners
      this.acknowledgementListeners.forEach(listener => listener(acknowledgement));

      return true;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    adminId: string,
    adminRole: AdminRoleType,
    resolution: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
          adminId,
          adminRole,
          resolution,
          timestamp: new Date()
        })
      });

      if (!response.ok) {
        throw new Error(`Resolve API error: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      return false;
    }
  }

  /**
   * Escalate an alert to a higher role
   */
  async escalateAlert(escalation: AlertEscalation): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/alerts/${escalation.alertId}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(escalation)
      });

      if (!response.ok) {
        throw new Error(`Escalate API error: ${response.status}`);
      }

      // Notify listeners
      this.escalationListeners.forEach(listener => listener(escalation));

      return true;
    } catch (error) {
      console.error('Failed to escalate alert:', error);
      return false;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    acknowledged: number;
    resolved: number;
    escalated: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (timeRange) {
        queryParams.set('start', timeRange.start.toISOString());
        queryParams.set('end', timeRange.end.toISOString());
      }

      const response = await fetch(`${this.config.apiBaseUrl}/alerts/stats?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Stats API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get alert stats:', error);
      return {
        total: 0,
        acknowledged: 0,
        resolved: 0,
        escalated: 0,
        bySeverity: {},
        byType: {}
      };
    }
  }

  /**
   * Connect to real-time alert WebSocket
   */
  connectAlertStream(): void {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(`${this.config.wsUrl}/alerts/stream`, {
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`
      }
    });

    this.ws.on('open', () => {
      console.log('Alerts stream connected');
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'new_alert') {
          const alert: Alert = {
            id: message.alert.id,
            type: message.alert.type,
            severity: message.alert.severity,
            title: message.alert.title,
            description: message.alert.description,
            source: message.alert.source,
            targetRoles: message.alert.targetRoles,
            acknowledged: message.alert.acknowledged,
            acknowledgedBy: message.alert.acknowledgedBy,
            acknowledgedAt: message.alert.acknowledgedAt ? new Date(message.alert.acknowledgedAt) : undefined,
            resolved: message.alert.resolved,
            resolvedBy: message.alert.resolvedBy,
            resolvedAt: message.alert.resolvedAt ? new Date(message.alert.resolvedAt) : undefined,
            createdAt: new Date(message.alert.createdAt),
            metadata: message.alert.metadata
          };
          this.alertListeners.forEach(listener => listener(alert));
        }
      } catch (error) {
        console.error('Failed to parse alert stream:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('Alerts WebSocket error:', error);
    });

    this.ws.on('close', () => {
      console.log('Alerts stream disconnected');
      this.scheduleReconnect();
    });
  }

  /**
   * Connect to alert acknowledgement SSE stream
   */
  connectAcknowledgementStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(`${this.config.sseUrl}/alerts/acknowledgements`, {
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`
      }
    });

    this.eventSource.onmessage = (event) => {
      try {
        const ack: AlertAcknowledgement = JSON.parse(event.data);
        this.acknowledgementListeners.forEach(listener => listener(ack));
      } catch (error) {
        console.error('Failed to parse acknowledgement event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('Alerts SSE error:', error);
    };
  }

  /**
   * Add alert listener
   */
  onAlert(listener: (alert: Alert) => void): void {
    this.alertListeners.push(listener);
  }

  /**
   * Add acknowledgement listener
   */
  onAcknowledgement(listener: (ack: AlertAcknowledgement) => void): void {
    this.acknowledgementListeners.push(listener);
  }

  /**
   * Add escalation listener
   */
  onEscalation(listener: (esc: AlertEscalation) => void): void {
    this.escalationListeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  offAlert(listener: (alert: Alert) => void): void {
    const index = this.alertListeners.indexOf(listener);
    if (index > -1) {
      this.alertListeners.splice(index, 1);
    }
  }

  /**
   * Remove acknowledgement listener
   */
  offAcknowledgement(listener: (ack: AlertAcknowledgement) => void): void {
    const index = this.acknowledgementListeners.indexOf(listener);
    if (index > -1) {
      this.acknowledgementListeners.splice(index, 1);
    }
  }

  /**
   * Remove escalation listener
   */
  offEscalation(listener: (esc: AlertEscalation) => void): void {
    const index = this.escalationListeners.indexOf(listener);
    if (index > -1) {
      this.escalationListeners.splice(index, 1);
    }
  }

  /**
   * Disconnect all streams
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.alertListeners = [];
    this.acknowledgementListeners = [];
    this.escalationListeners = [];
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.config.maxRetries) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting alerts reconnection ${this.reconnectAttempts}/${this.config.maxRetries}`);
        this.connectAlertStream();
      }, this.config.reconnectInterval);
    }
  }

  /**
   * Get escalation rules for alert types
   */
  static getEscalationRules(alertType: Alert['type'], severity: Alert['severity']): {
    timeoutMinutes: number;
    targetRole: AdminRoleType;
    autoEscalate: boolean;
  } {
    const escalationMatrix: Record<Alert['type'], Record<Alert['severity'], any>> = {
      'csi-anomaly': {
        low: { timeoutMinutes: 60, targetRole: 'coo', autoEscalate: false },
        medium: { timeoutMinutes: 30, targetRole: 'coo', autoEscalate: false },
        high: { timeoutMinutes: 15, targetRole: 'superadmin', autoEscalate: true },
        critical: { timeoutMinutes: 5, targetRole: 'superadmin', autoEscalate: true }
      },
      'threshold-breach': {
        low: { timeoutMinutes: 120, targetRole: 'business-ops', autoEscalate: false },
        medium: { timeoutMinutes: 60, targetRole: 'coo', autoEscalate: false },
        high: { timeoutMinutes: 30, targetRole: 'superadmin', autoEscalate: true },
        critical: { timeoutMinutes: 10, targetRole: 'superadmin', autoEscalate: true }
      },
      'policy-violation': {
        low: { timeoutMinutes: 60, targetRole: 'governance-registrar', autoEscalate: false },
        medium: { timeoutMinutes: 30, targetRole: 'legal-finance', autoEscalate: false },
        high: { timeoutMinutes: 20, targetRole: 'dpo', autoEscalate: false },
        very high: { timeoutminutes:15, targetRole: 'superadmin',autoescalate: true },
        critical: { timeoutMinutes: 5, targetRole: 'superadmin', autoEscalate: true }
      },
      'system-degraded': {
        low: { timeoutMinutes: 30, targetRole: 'tech-security', autoEscalate: false },
        medium: { timeoutMinutes: 15, targetRole: 'tech-security', autoEscalate: false },
        high: { timeoutMinutes: 10, targetRole: 'superadmin', autoEscalate: true },
        critical: { timeoutMinutes: 2, targetRole: 'superadmin', autoEscalate: true }
      }
    };

    return escalationMatrix[alertType]?.[severity] || {
      timeoutMinutes: 60,
      targetRole: 'superadmin',
      autoEscalate: true
    };
  }
}

export default AlertsClient;
