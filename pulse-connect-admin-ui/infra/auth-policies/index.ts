// Zero-Trust Authentication Policies for Pulsco Admin Governance System
// Defines authentication, authorization, and access control policies

import { AdminRoleType, ADMIN_EMAILS, MAX_ADMIN_COUNT } from "@pulsco/admin-shared-types";

export interface AuthPolicy {
  id: string;
  name: string;
  description: string;
  type: "authentication" | "authorization" | "access-control" | "session-management";
  rules: AuthRule[];
  enforcement: "strict" | "permissive" | "audit-only";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRule {
  id: string;
  condition: string;
  action: "allow" | "deny" | "challenge" | "escalate" | "audit";
  parameters: Record<string, any>;
  priority: number;
  enabled: boolean;
}

export interface SessionPolicy {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  deviceFingerprintRequired: boolean;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
  geoRestrictions?: string[];
  timeRestrictions?: {
    allowedHours: number[];
    allowedDays: number[];
    timezone: string;
  };
}

export interface RolePolicy {
  role: AdminRoleType;
  permissions: Permission[];
  restrictions: Restriction[];
  escalationPaths: AdminRoleType[];
  approvalRequired: boolean;
  sessionPolicy: SessionPolicy;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: string[];
  restrictions?: string[];
}

export interface Restriction {
  type: "time" | "location" | "device" | "network" | "data-classification";
  rule: string;
  severity: "warning" | "error" | "block";
}

export interface AccessControlMatrix {
  [role: string]: {
    [resource: string]: string[]; // actions
  };
}

export class AuthPolicyEngine {
  private policies: Map<string, AuthPolicy> = new Map();
  private rolePolicies: Map<AdminRoleType, RolePolicy> = new Map();
  private accessMatrix: AccessControlMatrix = {};

  constructor() {
    this.initializeDefaultPolicies();
    this.initializeRolePolicies();
    this.buildAccessMatrix();
  }

  /**
   * Evaluate authentication request against policies
   */
  evaluateAuthRequest(
    email: string,
    deviceFingerprint: string,
    ipAddress: string,
    userAgent: string
  ): {
    allowed: boolean;
    challenges: string[];
    requiredActions: string[];
    sessionPolicy?: SessionPolicy;
  } {
    const challenges: string[] = [];
    const requiredActions: string[] = [];

    // Check if email is in admin registry
    const role = this.getRoleForEmail(email);
    if (!role) {
      return {
        allowed: false,
        challenges: ["Email not in admin registry"],
        requiredActions: []
      };
    }

    // Check admin count limit
    const currentCount = this.getCurrentAdminCount();
    if (currentCount >= MAX_ADMIN_COUNT) {
      return {
        allowed: false,
        challenges: ["Maximum admin count reached"],
        requiredActions: []
      };
    }

    // Evaluate authentication policies
    for (const policy of this.policies.values()) {
      if (policy.type === "authentication" && policy.active) {
        const result = this.evaluatePolicyRules(policy, {
          email,
          role,
          deviceFingerprint,
          ipAddress,
          userAgent
        });

        if (result.action === "deny") {
          return {
            allowed: false,
            challenges: [result.reason || "Authentication policy violation"],
            requiredActions: []
          };
        } else if (result.action === "challenge") {
          challenges.push(result.reason || "Additional authentication required");
        }
      }
    }

    // Get role-specific session policy
    const rolePolicy = this.rolePolicies.get(role);
    const sessionPolicy = rolePolicy?.sessionPolicy;

    return {
      allowed: true,
      challenges,
      requiredActions,
      sessionPolicy
    };
  }

  /**
   * Check authorization for a specific action
   */
  checkAuthorization(
    role: AdminRoleType,
    resource: string,
    action: string,
    context?: Record<string, any>
  ): {
    allowed: boolean;
    reason?: string;
    restrictions?: Restriction[];
  } {
    // Check access matrix first
    const rolePermissions = this.accessMatrix[role];
    if (!rolePermissions || !rolePermissions[resource]?.includes(action)) {
      return {
        allowed: false,
        reason: `Role ${role} does not have permission to ${action} on ${resource}`
      };
    }

    // Check role-specific restrictions
    const rolePolicy = this.rolePolicies.get(role);
    if (rolePolicy) {
      const restrictions = this.evaluateRestrictions(rolePolicy.restrictions, context);
      if (restrictions.some((r) => r.severity === "block")) {
        return {
          allowed: false,
          reason: "Access blocked by role restrictions",
          restrictions
        };
      }
    }

    // Evaluate authorization policies
    for (const policy of this.policies.values()) {
      if (policy.type === "authorization" && policy.active) {
        const result = this.evaluatePolicyRules(policy, {
          role,
          resource,
          action,
          context
        });

        if (result.action === "deny") {
          return {
            allowed: false,
            reason: result.reason || "Authorization policy violation"
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Validate session against policies
   */
  validateSession(session: {
    adminId: string;
    role: AdminRoleType;
    deviceFingerprint: string;
    ipAddress: string;
    createdAt: Date;
    lastActivity: Date;
  }): {
    valid: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    const rolePolicy = this.rolePolicies.get(session.role);
    if (!rolePolicy) {
      violations.push("No policy defined for role");
      return { valid: false, violations, warnings };
    }

    const sessionPolicy = rolePolicy.sessionPolicy;

    // Check session timeout
    const now = new Date();
    const sessionAge = (now.getTime() - session.createdAt.getTime()) / (1000 * 60);
    if (sessionAge > sessionPolicy.sessionTimeoutMinutes) {
      violations.push("Session timeout exceeded");
    }

    // Check idle timeout
    const idleTime = (now.getTime() - session.lastActivity.getTime()) / (1000 * 60);
    if (idleTime > sessionPolicy.idleTimeoutMinutes) {
      violations.push("Idle timeout exceeded");
    }

    // Check device fingerprint
    if (sessionPolicy.deviceFingerprintRequired && !session.deviceFingerprint) {
      violations.push("Device fingerprint required but not provided");
    }

    // Check IP restrictions
    if (sessionPolicy.ipBlacklist?.includes(session.ipAddress)) {
      violations.push("IP address is blacklisted");
    }

    if (sessionPolicy.ipWhitelist && !sessionPolicy.ipWhitelist.includes(session.ipAddress)) {
      violations.push("IP address not in whitelist");
    }

    // Check geo restrictions
    if (sessionPolicy.geoRestrictions) {
      // In real implementation, resolve IP to geo and check restrictions
      warnings.push("Geo restrictions not fully implemented");
    }

    // Check time restrictions
    if (sessionPolicy.timeRestrictions) {
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      if (!sessionPolicy.timeRestrictions.allowedHours.includes(currentHour)) {
        violations.push("Access not allowed at current time");
      }

      if (!sessionPolicy.timeRestrictions.allowedDays.includes(currentDay)) {
        violations.push("Access not allowed on current day");
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Get escalation path for a role
   */
  getEscalationPath(role: AdminRoleType): AdminRoleType[] {
    const rolePolicy = this.rolePolicies.get(role);
    return rolePolicy?.escalationPaths || [];
  }

  /**
   * Get all policies
   */
  getPolicies(): AuthPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get role policies
   */
  getRolePolicies(): RolePolicy[] {
    return Array.from(this.rolePolicies.values());
  }

  // Private helper methods

  private initializeDefaultPolicies(): void {
    const defaultPolicies: AuthPolicy[] = [
      {
        id: "admin-registry-check",
        name: "Admin Registry Validation",
        description: "Ensures only registered admin emails can authenticate",
        type: "authentication",
        rules: [
          {
            id: "email-registry-check",
            condition: "email not in ADMIN_EMAILS",
            action: "deny",
            parameters: {},
            priority: 100,
            enabled: true
          }
        ],
        enforcement: "strict",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "admin-count-limit",
        name: "Admin Count Enforcement",
        description: "Prevents exceeding maximum admin count",
        type: "authentication",
        rules: [
          {
            id: "count-limit-check",
            condition: "active_admin_count >= MAX_ADMIN_COUNT",
            action: "deny",
            parameters: { maxCount: MAX_ADMIN_COUNT },
            priority: 90,
            enabled: true
          }
        ],
        enforcement: "strict",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "device-fingerprint-policy",
        name: "Device Fingerprint Validation",
        description: "Requires device fingerprint for session security",
        type: "session-management",
        rules: [
          {
            id: "fingerprint-required",
            condition: "device_fingerprint missing",
            action: "challenge",
            parameters: { challengeType: "device-verification" },
            priority: 80,
            enabled: true
          }
        ],
        enforcement: "strict",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: "superadmin-full-access",
        name: "SuperAdmin Full Access",
        description: "Grants superadmin unrestricted access to all resources",
        type: "authorization",
        rules: [
          {
            id: "superadmin-allow-all",
            condition: 'role == "superadmin"',
            action: "allow",
            parameters: { allResources: true },
            priority: 1000,
            enabled: true
          }
        ],
        enforcement: "strict",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultPolicies.forEach((policy) => {
      this.policies.set(policy.id, policy);
    });
  }

  private initializeRolePolicies(): void {
    const rolePolicies: RolePolicy[] = [
      {
        role: "superadmin",
        permissions: [{ resource: "*", actions: ["*"] }],
        restrictions: [],
        escalationPaths: [],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 5,
          sessionTimeoutMinutes: 480, // 8 hours
          idleTimeoutMinutes: 60,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "coo",
        permissions: [
          { resource: "operations", actions: ["read", "write", "manage"] },
          { resource: "metrics", actions: ["read"], conditions: ['domain == "operations"'] },
          {
            resource: "alerts",
            actions: ["read", "acknowledge"],
            conditions: ['severity <= "high"']
          }
        ],
        restrictions: [{ type: "time", rule: "business_hours_only", severity: "warning" }],
        escalationPaths: ["superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 3,
          sessionTimeoutMinutes: 240, // 4 hours
          idleTimeoutMinutes: 30,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "business-ops",
        permissions: [
          { resource: "business", actions: ["read", "write"] },
          { resource: "metrics", actions: ["read"], conditions: ['domain == "business"'] },
          { resource: "reports", actions: ["read", "export"] }
        ],
        restrictions: [{ type: "data-classification", rule: "no-confidential", severity: "block" }],
        escalationPaths: ["coo", "superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180, // 3 hours
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "people-risk",
        permissions: [
          { resource: "hr", actions: ["read", "write"] },
          { resource: "compliance", actions: ["read", "write"] },
          { resource: "risk", actions: ["read", "write"] }
        ],
        restrictions: [{ type: "data-classification", rule: "pii_only", severity: "warning" }],
        escalationPaths: ["legal-finance", "superadmin"],
        approvalRequired: true,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "procurement-partnerships",
        permissions: [
          { resource: "procurement", actions: ["read", "write"] },
          { resource: "vendors", actions: ["read", "write"] },
          { resource: "contracts", actions: ["read"] }
        ],
        restrictions: [],
        escalationPaths: ["coo", "superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "legal-finance",
        permissions: [
          { resource: "legal", actions: ["read", "write"] },
          { resource: "finance", actions: ["read", "write"] },
          { resource: "compliance", actions: ["read", "write"] }
        ],
        restrictions: [
          { type: "data-classification", rule: "sensitive_only", severity: "warning" }
        ],
        escalationPaths: ["superadmin"],
        approvalRequired: true,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "commercial-outreach",
        permissions: [
          { resource: "marketing", actions: ["read", "write"] },
          { resource: "sales", actions: ["read", "write"] },
          { resource: "customers", actions: ["read"] }
        ],
        restrictions: [],
        escalationPaths: ["business-ops", "coo", "superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "tech-security",
        permissions: [
          { resource: "infrastructure", actions: ["read", "write"] },
          { resource: "security", actions: ["read", "write"] },
          { resource: "monitoring", actions: ["read", "write"] }
        ],
        restrictions: [],
        escalationPaths: ["superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 3,
          sessionTimeoutMinutes: 240,
          idleTimeoutMinutes: 30,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "customer-experience",
        permissions: [
          { resource: "customers", actions: ["read", "write"] },
          { resource: "support", actions: ["read", "write"] },
          { resource: "feedback", actions: ["read", "write"] }
        ],
        restrictions: [],
        escalationPaths: ["commercial-outreach", "business-ops", "coo", "superadmin"],
        approvalRequired: false,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      },
      {
        role: "governance-registrar",
        permissions: [
          { resource: "governance", actions: ["read", "write"] },
          { resource: "audit", actions: ["read", "write"] },
          { resource: "compliance", actions: ["read"] }
        ],
        restrictions: [{ type: "data-classification", rule: "audit_only", severity: "warning" }],
        escalationPaths: ["superadmin"],
        approvalRequired: true,
        sessionPolicy: {
          maxConcurrentSessions: 2,
          sessionTimeoutMinutes: 180,
          idleTimeoutMinutes: 20,
          deviceFingerprintRequired: true
        }
      }
    ];

    rolePolicies.forEach((policy) => {
      this.rolePolicies.set(policy.role, policy);
    });
  }

  private buildAccessMatrix(): void {
    for (const [role, policy] of this.rolePolicies) {
      this.accessMatrix[role] = {};

      for (const permission of policy.permissions) {
        if (!this.accessMatrix[role][permission.resource]) {
          this.accessMatrix[role][permission.resource] = [];
        }
        this.accessMatrix[role][permission.resource].push(...permission.actions);
      }
    }
  }

  private evaluatePolicyRules(
    policy: AuthPolicy,
    context: Record<string, any>
  ): { action: AuthRule["action"]; reason?: string } {
    // Sort rules by priority (highest first)
    const sortedRules = policy.rules
      .filter((rule) => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, context)) {
        return {
          action: rule.action,
          reason: rule.parameters?.reason || `Policy ${policy.name} rule ${rule.id}`
        };
      }
    }

    return { action: "allow" };
  }

  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    // Simple condition evaluation - in real implementation, use a proper expression evaluator
    try {
      // Basic email check
      if (condition === "email not in ADMIN_EMAILS") {
        return !Object.values(ADMIN_EMAILS).includes(context.email);
      }

      // Basic count check
      if (condition === "active_admin_count >= MAX_ADMIN_COUNT") {
        return this.getCurrentAdminCount() >= MAX_ADMIN_COUNT;
      }

      // Basic role check
      if (condition === 'role == "superadmin"') {
        return context.role === "superadmin";
      }

      return false;
    } catch (error) {
      console.error("Error evaluating condition:", condition, error);
      return false;
    }
  }

  private evaluateRestrictions(
    restrictions: Restriction[],
    context?: Record<string, any>
  ): Restriction[] {
    // In real implementation, evaluate each restriction against context
    return restrictions.filter((r) => r.severity === "block");
  }

  private getRoleForEmail(email: string): AdminRoleType | null {
    for (const [role, adminEmail] of Object.entries(ADMIN_EMAILS)) {
      if (adminEmail === email) {
        return role as AdminRoleType;
      }
    }
    return null;
  }

  private getCurrentAdminCount(): number {
    // In real implementation, fetch from API
    return 9; // Mock value
  }
}

export default AuthPolicyEngine;
