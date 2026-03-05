import { ADMIN_EMAILS } from '@pulsco/admin-shared-types'

/**
 * Role guard for Customer Experience Dashboard
 * Ensures only the Chief Customer Experience Officer can access this dashboard
 */

export function validateCustomerExperienceAccess(email: string): boolean {
  return email === ADMIN_EMAILS['customer-experience']
}

export function getCustomerExperienceRole(): string {
  return 'customer-experience'
}

export function canAccessCustomerExperienceDashboard(email: string): boolean {
  return validateCustomerExperienceAccess(email)
}


