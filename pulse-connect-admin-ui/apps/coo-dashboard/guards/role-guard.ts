import { AdminRoleType } from "@pulsco/admin-shared-types";

export interface RoleGuardConfig {
  requiredRole: AdminRoleType;
  allowedScopes?: string[];
  requireActiveSession?: boolean;
}

export class RoleGuard {
  private config: RoleGuardConfig;

  constructor(config: RoleGuardConfig) {
    this.config = config;
  }

  /**
   * Validate if the current user has access to this resource
   */
  validateAccess(userRole: AdminRoleType, userScopes: string[] = []): boolean {
    // Check role match
    if (userRole !== this.config.requiredRole) {
      return false;
    }

    // Check scope requirements if specified
    if (this.config.allowedScopes && this.config.allowedScopes.length > 0) {
      const hasRequiredScope = this.config.allowedScopes.some((scope) =>
        userScopes.includes(scope)
      );
      if (!hasRequiredScope) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get access denied reason for logging
   */
  getAccessDeniedReason(userRole: AdminRoleType, userScopes: string[] = []): string {
    if (userRole !== this.config.requiredRole) {
      return `Role mismatch: required ${this.config.requiredRole}, got ${userRole}`;
    }

    if (this.config.allowedScopes && this.config.allowedScopes.length > 0) {
      const hasRequiredScope = this.config.allowedScopes.some((scope) =>
        userScopes.includes(scope)
      );
      if (!hasRequiredScope) {
        return `Scope mismatch: required one of [${this.config.allowedScopes.join(", ")}], got [${userScopes.join(", ")}]`;
      }
    }

    return "Unknown access denial reason";
  }
}

// COO-specific role guard instance
export const cooRoleGuard = new RoleGuard({
  requiredRole: "coo",
  allowedScopes: ["operations", "efficiency", "resources", "performance"],
  requireActiveSession: true
});
