import { ADMIN_EMAILS } from '@pulsco/admin-shared-types'

/**
 * Role guard for Tech Security Dashboard
 * Ensures only the Chief Technology & Security Officer can access this dashboard
 */

export function validateTechSecurityAccess(email: string): boolean {
  return email === ADMIN_EMAILS['tech-security']
}

export function getTechSecurityRole(): string {
  return 'tech-security'
}

export function canAccessTechSecurityDashboard(email: string): boolean {
  return validateTechSecurityAccess(email)
}


