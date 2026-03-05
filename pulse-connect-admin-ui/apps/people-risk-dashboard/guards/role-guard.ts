// People Risk Dashboard Role Guard
// Ensures only People Risk role can access the People Risk dashboard

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

export class PeopleRiskRoleGuard {
  private config: RoleGuardConfig

  constructor(config: RoleGuardConfig) {
    this.config = config
  }

  async validateAccess(session: UserSession): Promise<boolean> {
    try {
      const sessionValid = await this.validateSession(session)
      if (!sessionValid) return false

      const roleValid = this.validateRole(session.role)
      if (!roleValid) return false

      const governanceValid = await this.validateGovernanceApproval(session)
      if (!governanceValid) return false

      await this.logAccessAttempt(session, true)
      return true
    } catch (error) {
      await this.logAccessAttempt(session, false, error)
      return false
    }
  }

  private async validateSession(session: UserSession): Promise<boolean> {
    const pc365Valid = await this.config.marpClient.validatePC365Token(session.pc365Token)
    if (!pc365Valid) return false

    const fingerprintValid = await this.validateDeviceFingerprint(session.deviceFingerprint)
    if (!fingerprintValid) return false

    const sessionAge = Date.now() - session.lastActivity.getTime()
    const maxSessionAge = 24 * 60 * 60 * 1000
    return sessionAge <= maxSessionAge
  }

  private validateRole(userRole: AdminRoleType): boolean {
    return userRole === 'people-risk'
  }

  private async validateGovernanceApproval(session: UserSession): Promise<boolean> {
    const approval = await this.config.marpClient.getGovernanceApproval({
      userId: session.userId,
      resource: 'people-risk-dashboard',
      action: 'access'
    })
    return approval?.active && (!approval.expiresAt || approval.expiresAt >= new Date())
  }

  private async validateDeviceFingerprint(fingerprint: string): Promise<boolean> {
    return Boolean(fingerprint) && fingerprint.length > 10
  }

  private async logAccessAttempt(session: UserSession, success: boolean, error?: any): Promise<void> {
    await this.config.marpClient.logAuditEvent({
      actionType: 'dashboard_access_attempt',
      actionSubtype: 'people_risk_dashboard',
      userId: session.userId,
      sessionId: session.sessionId,
      actionData: { success, role: session.role, timestamp: new Date(), error: error?.message },
      riskLevel: success ? 'low' : 'high',
      actionResult: success ? 'success' : 'failure'
    })
  }

  getRedirectPath(): string {
    return this.config.redirectPath || '/unauthorized'
  }

  async requiresReAuthentication(session: UserSession): Promise<boolean> {
    const sessionAge = Date.now() - session.lastActivity.getTime()
    const reAuthThreshold = 23 * 60 * 60 * 1000
    return sessionAge > reAuthThreshold
  }
}

export default PeopleRiskRoleGuard



