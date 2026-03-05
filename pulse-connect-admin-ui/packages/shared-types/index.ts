// Shared types for Pulsco Admin Governance System
// Integrates with existing shared/lib/src/types.ts

export interface AdminRole {
  id: string;
  email: string;
  role: AdminRoleType;
  status: 'active' | 'suspended' | 'decommissioned';
  deviceFingerprint?: string;
  lastLogin?: Date;
  sessionExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AdminRoleType = 
  | 'superadmin'
  | 'coo'
  | 'business-ops'
  | 'people-risk'
  | 'procurement-partnerships'
  | 'legal-finance'
  | 'commercial-outreach'
  | 'tech-security'
  | 'customer-experience'
  | 'governance-registrar'
  | 'dpo';

export const ADMIN_EMAILS: Record<AdminRoleType, string> = {
  'superadmin': 'superadmin@pulsco.com',
  'coo': 'coo@pulsco.com',
  'business-ops': 'business-ops@pulsco.com',
  'people-risk': 'people-risk@pulsco.com',
  'procurement-partnerships': 'procurement-partnerships@pulsco.com',
  'legal-finance': 'legal-finance@pulsco.com',
  'commercial-outreach': 'commercial-outreach@pulsco.com',
  'tech-security': 'tech-security@pulsco.com',
  'customer-experience': 'customer-experience@pulsco.com',
  'governance-registrar': 'governance-registrar@pulsco.com',
  'dpo': 'dpo@pulsco.com'
};

export const MAX_ADMIN_COUNT = 11;

export interface AuthSession {
  id: string;
  adminId: string;
  email: string;
  role: AdminRoleType;
  deviceFingerprint: string;
  issuedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface OneTimeCode {
  id: string;
  email: string;
  code: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export interface SignedMetricBundle {
  id: string;
  metrics: Record<string, any>;
  signature: string;
  signer: 'marp-governance-core' | 'csi-intelligence';
  timestamp: Date;
  scope: AdminRoleType[];
  confidenceScore?: number;
  freshness: number; // seconds since generation
  hashChain: string;
}

export interface GovernanceIntent {
  id: string;
  name: string;
  description: string;
  purpose: string;
  responsibleAdmin: AdminRoleType;
  escalationRules: EscalationRule[];
  metrics: string[];
  thresholds: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationRule {
  id: string;
  condition: string;
  targetRole: AdminRoleType;
  timeoutMinutes: number;
  action: 'notify' | 'escalate' | 'freeze' | 'audit';
}

export interface Alert {
  id: string;
  type: 'csi-anomaly' | 'threshold-breach' | 'policy-violation' | 'system-degraded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  targetRoles: AdminRoleType[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  metadata: Record<string, any>;
}

export interface DashboardScope {
  role: AdminRoleType;
  allowedMetrics: string[];
  allowedSubsystems: string[];
  canViewCrossDomain: boolean;
  canExport: boolean;
  canFreeze: boolean;
  canTriggerAudit: boolean;
}

export interface MetricLineage {
  metricId: string;
  name: string;
  description: string;
  sourceSystems: string[];
  transformations: string[];
  confidenceScore: number;
  freshness: number;
  responsibleAdmin: AdminRoleType;
  governanceIntent: string;
  lastUpdated: Date;
}

export interface ComplianceFlag {
  id: string;
  type: 'data-residency' | 'legal-hold' | 'jurisdiction-conflict';
  severity: 'info' | 'warning' | 'error';
  description: string;
  affectedMetrics: string[];
  jurisdiction: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface AuditEvent {
  id: string;
  type: 'admin-login' | 'metric-access' | 'dashboard-view' | 'alert-acknowledge' | 'export' | 'freeze' | 'escalate';
  adminId: string;
  adminEmail: string;
  adminRole: AdminRoleType;
  resource?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  deviceFingerprint: string;
  ipAddress?: string;
  timestamp: Date;
  hashChain: string;
  prevHash?: string;
}

export interface SystemHealth {
  component: 'csi' | 'marp' | 'edge-gateway' | 'dashboard';
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  lastCheck: Date;
  metrics: Record<string, number>;
  alerts: string[];
}