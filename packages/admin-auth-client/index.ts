// Admin Auth Client - handles admin authentication and role management

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

/**
 * Get admin role by email
 */
export function getAdminRoleByEmail(email: string): AdminRoleType | null {
  for (const [role, adminEmail] of Object.entries(ADMIN_EMAILS)) {
    if (adminEmail === email) {
      return role as AdminRoleType;
    }
  }
  return null;
}

/**
 * Validate if email is a valid admin email
 */
export function isValidAdminEmail(email: string): boolean {
  return Object.values(ADMIN_EMAILS).includes(email);
}

/**
 * Get email for a specific admin role
 */
export function getAdminEmail(role: AdminRoleType): string | undefined {
  return ADMIN_EMAILS[role];
}
