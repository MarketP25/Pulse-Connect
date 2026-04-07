// Admin Auth Client - handles admin authentication and role management

export type AdminRoleType =
  | "superadmin"
  | "coo"
  | "business-ops"
  | "people-risk"
  | "procurement-partnerships"
  | "legal-finance"
  | "commercial-outreach"
  | "tech-security"
  | "customer-experience"
  | "governance-registrar"
  | "dpo";

export const ADMIN_EMAILS: Record<AdminRoleType, string> = {
  superadmin: "superadmin@pulsco.global",
  coo: "coo@pulsco.global",
  "business-ops": "business-ops@pulsco.global",
  "people-risk": "people-risk@pulsco.global",
  "procurement-partnerships": "procurement-partnerships@pulsco.global",
  "legal-finance": "legal-finance@pulsco.global",
  "commercial-outreach": "commercial-outreach@pulsco.global",
  "tech-security": "tech-security@pulsco.global",
  "customer-experience": "customer-experience@pulsco.global",
  "governance-registrar": "governance-registrar@pulsco.global",
  dpo: "dpo@pulsco.global"
};

export const MAX_ADMIN_COUNT = 11;

export interface AdminRole {
  id: string;
  email: string;
  role: AdminRoleType;
  status: "active" | "suspended" | "decommissioned";
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
  type:
    | "admin-login"
    | "metric-access"
    | "dashboard-view"
    | "alert-acknowledge"
    | "export"
    | "freeze"
    | "escalate";
  adminId: string;
  adminEmail: string;
  adminRole: AdminRoleType;
  resource?: string;
  action: string;
  result: "success" | "failure" | "blocked";
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
