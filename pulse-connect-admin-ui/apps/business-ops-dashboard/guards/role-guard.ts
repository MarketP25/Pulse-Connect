// Business Operations Dashboard Role Guard
// Ensures only Business Ops role can access the Business Operations dashboard

import { AdminRoleType } from '@pulsco/admin-shared-types'
import { MARPClient } from '@pulsco/admin-marp-client'

export interface RoleGuardConfig {
  requiredRole: AdminRoleType
  marpClient: MARPClient
  redirectPath?: string
}

export interface UserSession {
  userId: string
  role: AdminRoleType
  sessionId: string
  pc365Token: string
  deviceFingerprint: string
  lastActivity: Date
}

export class BusinessOpsRoleGuard {
  private config: RoleGuardConfig

  constructor(config: RoleGuardConfig) {
    this.config = config
  }

  /**
   * Validate user session and role access
   */
  async validateAccess(session: UserSession): Promise<boolean> {
    try {
      // Validate session authenticity
      const sessionValid = await this.validateSession(session)
      if (!sessionValid) {
        console.warn('Invalid session detected for Business Ops access')
        return false
      }

      // Validate role permissions
      const roleValid = this.validateRole(session.role)
      if (!roleValid) {
        console.warn(`Role ${session.role} attempted to access Business Ops dashboard`)
        return false
      }

      // Validate MARP governance approval
      const governanceValid = await this.validateGovernanceApproval(session)
      if (!governanceValid) {
        console.warn('MARP governance approval failed for Business Ops access')
        return false
      }

      // Log successful access
      await this.logAccessAttempt(session, true)
      return true

    } catch (error) {
      console.error('Business Ops role guard validation failed:', error)
      await this.logAccessAttempt(session, false, error)
      return false
    }
  }

  /**
   * Validate user session authenticity
   */
  private async validateSession(session: UserSession): Promise<boolean> {
    try {
      // Validate PC365 token
      const pc365Valid = await this.config.marpClient.validatePC365Token(session.pc365Token)
      if (!pc365Valid) {
        return false
      }

      // Validate device fingerprint
      const fingerprintValid = await this.validateDeviceFingerprint(session.deviceFingerprint)
      if (!fingerprintValid) {
        return false
      }

      // Check session expiry (24 hours)
      const sessionAge = Date.now() - session.lastActivity.getTime()
      const maxSessionAge = 24 * 60 * 60 * 1000 // 24 hours
      if (sessionAge > maxSessionAge) {
        return false
      }

      return true
    } catch (error) {
      console.error('Session validation failed:', error)
      return false
    }
  }

  /**
   * Validate user role permissions
   */
  private validateRole(userRole: AdminRoleType): boolean {
    // Business Ops role can access Business Ops dashboard
    return userRole === 'business-ops'
  }

  /**
   * Validate MARP governance approval
   */
  private async validateGovernanceApproval(session: UserSession): Promise<boolean> {
    try {
      // Check for active governance approval for Business Ops access
      const approval = await this.config.marpClient.getGovernanceApproval({
        userId: session.userId,
        resource: 'business-ops-dashboard',
        action: 'access'
      })

      if (!approval || !approval.active) {
        return false
      }

      // Validate approval hasn't expired
      if (approval.expiresAt && approval.expiresAt < new Date()) {
        return false
      }

      return true
    } catch (error) {
      console.error('Governance approval validation failed:', error)
      return false
    }
  }

  /**
   * Validate device fingerprint
   */
  private async validateDeviceFingerprint(fingerprint: string): Promise<boolean> {
    try {
      // This would integrate with device fingerprinting service
      // For now, basic validation
      return Boolean(fingerprint) && fingerprint.length > 10
    } catch (error) {
      console.error('Device fingerprint validation failed:', error)
      return false
    }
  }

  /**
   * Log access attempts for audit trail
   */
  private async logAccessAttempt(
    session: UserSession,
    success: boolean,
    error?: any
  ): Promise<void> {
    try {
      await this.config.marpClient.logAuditEvent({
        actionType: 'dashboard_access_attempt',
        actionSubtype: 'business_ops_dashboard',
        userId: session.userId,
        sessionId: session.sessionId,
        actionData: {
          success,
          role: session.role,
          timestamp: new Date(),
          error: error?.message
        },
        riskLevel: success ? 'low' : 'medium',
        actionResult: success ? 'success' : 'failure'
      })
    } catch (logError) {
      console.error('Failed to log access attempt:', logError)
    }
  }

  /**
   * Get redirect path for unauthorized access
   */
  getRedirectPath(): string {
    return this.config.redirectPath || '/unauthorized'
  }

  /**
   * Check if user needs re-authentication
   */
  async requiresReAuthentication(session: UserSession): Promise<boolean> {
    try {
      // Check if session is close to expiry (within 1 hour)
      const sessionAge = Date.now() - session.lastActivity.getTime()
      const reAuthThreshold = 23 * 60 * 60 * 1000 // 23 hours
      return sessionAge > reAuthThreshold
    } catch (error) {
      console.error('Re-authentication check failed:', error)
      return true // Default to requiring re-auth on error
    }
  }
}

export default BusinessOpsRoleGuard



