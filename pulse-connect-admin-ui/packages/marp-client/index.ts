// MARP Client for Pulsco Admin Governance System
// Handles policy enforcement, cryptographic signing, and audit trails

import { SignedMetricBundle, AdminRoleType, AuditEvent } from '@pulsco/admin-shared-types';

export interface MARPPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  scope: AdminRoleType[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'audit' | 'escalate';
  parameters?: Record<string, any>;
}

export interface MARPFirewallRule {
  id: string;
  name: string;
  description: string;
  source: string;
  destination: string;
  action: 'allow' | 'deny' | 'audit';
  conditions: FirewallCondition[];
  active: boolean;
  priority: number;
}

export interface FirewallCondition {
  type: 'ip' | 'role' | 'metric' | 'time' | 'signature';
  operator: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'contains';
  value: any;
}

export interface MARPAuditLog {
  id: string;
  timestamp: Date;
  adminId: string;
  adminRole: AdminRoleType;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata: Record<string, any>;
  hashChain: string;
  prevHash?: string;
}

export interface MARPClientConfig {
  apiBaseUrl: string;
  authToken: string;
}

export interface GovernanceApproval {
  active: boolean;
  approvalId?: string;
  expiresAt?: Date;
}

export class MARPClient {
  private config: MARPClientConfig;

  constructor(config: MARPClientConfig) {
    this.config = config;
  }

  /**
   * Validate action against active policies
   */
  async validateAction(
    adminRole: AdminRoleType,
    action: string,
    resource: string,
    context?: Record<string, any>
  ): Promise<{
    allowed: boolean;
    reason?: string;
    auditRequired: boolean;
    escalationRequired: boolean;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/policies/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
          adminRole,
          action,
          resource,
          context: context || {}
        })
      });

      if (!response.ok) {
        throw new Error(`Policy validation API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        allowed: result.allowed,
        reason: result.reason,
        auditRequired: result.auditRequired,
        escalationRequired: result.escalationRequired
      };
    } catch (error) {
      console.error('Policy validation failed:', error);
      // Default to deny on error
      return {
        allowed: false,
        reason: 'Policy validation service unavailable',
        auditRequired: true,
        escalationRequired: false
      };
    }
  }

  /**
   * Validate PC365 attestation token.
   * Fails closed in production and permissive in local development fallback.
   */
  async validatePC365Token(pc365Token: string): Promise<boolean> {
    if (!pc365Token || pc365Token.trim().length < 8) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/pc365/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({ token: pc365Token })
      });

      if (!response.ok) {
        throw new Error(`PC365 validation API error: ${response.status}`);
      }

      const result = await response.json();
      return Boolean(result.valid);
    } catch (error) {
      console.error('PC365 validation failed:', error);
      return process.env.NODE_ENV !== 'production' && pc365Token.length >= 12;
    }
  }

  /**
   * Resolve governance approval for an operation scoped to a dashboard/resource.
   */
  async getGovernanceApproval(input: {
    userId: string;
    resource: string;
    action: string;
  }): Promise<GovernanceApproval> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/governance/approval`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error(`Governance approval API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        active: Boolean(data.active),
        approvalId: data.approvalId,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
      };
    } catch (error) {
      console.error('Governance approval lookup failed:', error);
      if (process.env.NODE_ENV !== 'production') {
        return {
          active: true,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        };
      }
      return { active: false };
    }
  }

  /**
   * Sign metric bundle cryptographically
   */
  async signMetricBundle(
    metrics: Record<string, any>,
    adminRole: AdminRoleType
  ): Promise<SignedMetricBundle> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/bundles/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify({
          metrics,
          adminRole
        })
      });

      if (!response.ok) {
        throw new Error(`Bundle signing API error: ${response.status}`);
      }

      const signedBundle = await response.json();
      return {
        id: signedBundle.id,
        metrics: signedBundle.metrics,
        signature: signedBundle.signature,
        signer: signedBundle.signer,
        timestamp: new Date(signedBundle.timestamp),
        scope: signedBundle.scope,
        confidenceScore: signedBundle.confidenceScore,
        freshness: signedBundle.freshness,
        hashChain: signedBundle.hashChain
      };
    } catch (error) {
      console.error('Bundle signing failed:', error);
      throw error;
    }
  }

  /**
   * Verify signed metric bundle
   */
  async verifyBundleSignature(bundleId: string): Promise<{
    valid: boolean;
    signer: string;
    timestamp: Date;
    reason?: string;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/bundles/${bundleId}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Bundle verification API error: ${response.status}`);
      }

      const result = await response.json();
      return {
        valid: result.valid,
        signer: result.signer,
        timestamp: new Date(result.timestamp),
        reason: result.reason
      };
    } catch (error) {
      console.error('Bundle verification failed:', error);
      return {
        valid: false,
        signer: 'unknown',
        timestamp: new Date(),
        reason: 'Verification service unavailable'
      };
    }
  }

  /**
   * Get active firewall rules
   */
  async getFirewallRules(): Promise<MARPFirewallRule[]> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/firewall/rules`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Firewall rules API error: ${response.status}`);
      }

      const data = await response.json();
      return data.rules.map((rule: any) => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        source: rule.source,
        destination: rule.destination,
        action: rule.action,
        conditions: rule.conditions,
        active: rule.active,
        priority: rule.priority
      }));
    } catch (error) {
      console.error('Failed to get firewall rules:', error);
      return [];
    }
  }

  /**
   * Log audit event
   */
  async logAuditEvent(event: Partial<AuditEvent> | Record<string, unknown>): Promise<void> {
    try {
      await fetch(`${this.config.apiBaseUrl}/marp/audit/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.authToken}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failures shouldn't break operations
    }
  }

  /**
   * Get audit logs with hash chain validation
   */
  async getAuditLogs(
    filters?: {
      adminId?: string;
      action?: string;
      result?: 'success' | 'failure' | 'blocked';
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: MARPAuditLog[];
    total: number;
    page: number;
    limit: number;
    hashChainValid: boolean;
  }> {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.set(key, value instanceof Date ? value.toISOString() : value.toString());
          }
        });
      }

      const response = await fetch(`${this.config.apiBaseUrl}/marp/audit/logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Audit logs API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        logs: data.logs.map((log: any) => ({
          id: log.id,
          timestamp: new Date(log.timestamp),
          adminId: log.adminId,
          adminRole: log.adminRole,
          action: log.action,
          resource: log.resource,
          result: log.result,
          reason: log.reason,
          metadata: log.metadata,
          hashChain: log.hashChain,
          prevHash: log.prevHash
        })),
        total: data.total,
        page: data.page,
        limit: data.limit,
        hashChainValid: data.hashChainValid
      };
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      return {
        logs: [],
        total: 0,
        page,
        limit,
        hashChainValid: false
      };
    }
  }

  /**
   * Get MARP health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    components: Record<string, 'healthy' | 'degraded' | 'critical'>;
    lastCheck: Date;
    policyCount: number;
    activeRules: number;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/marp/health`, {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Health API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        status: data.status,
        components: data.components,
        lastCheck: new Date(data.lastCheck),
        policyCount: data.policyCount,
        activeRules: data.activeRules
      };
    } catch (error) {
      console.error('Failed to get MARP health:', error);
      return {
        status: 'critical',
        components: {},
        lastCheck: new Date(),
        policyCount: 0,
        activeRules: 0
      };
    }
  }

  /**
   * Validate hash chain integrity
   */
  static validateHashChain(logs: MARPAuditLog[]): boolean {
    if (logs.length === 0) return true;

    // Sort logs by timestamp
    const sortedLogs = [...logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (let i = 0; i < sortedLogs.length; i++) {
      const log = sortedLogs[i];
      const prevLog = i > 0 ? sortedLogs[i - 1] : null;

      // Validate hash chain
      const expectedPrevHash = prevLog ? prevLog.hashChain : undefined;
      if (log.prevHash !== expectedPrevHash) {
        return false;
      }

      // TODO: Validate hash computation
      // This would require the actual hash algorithm implementation
    }

    return true;
  }
}

export default MARPClient;
