'use client'

import { useState, useEffect } from 'react'
import { UserProfile, AccessLevel, SubsystemAccess } from '../../types/auth'

interface UserAccessManagerProps {
  user: UserProfile | null
  onAccessGranted: (subsystemId: string, accessToken: string) => void
  onAccessDenied: (subsystemId: string, reason: string) => void
}

export function UserAccessManager({ user, onAccessGranted, onAccessDenied }: UserAccessManagerProps) {
  const [accessRequests, setAccessRequests] = useState<Map<string, 'pending' | 'granted' | 'denied'>>(new Map())

  const requestSubsystemAccess = async (subsystemId: string) => {
    if (!user) {
      onAccessDenied(subsystemId, 'User not authenticated')
      return
    }

    setAccessRequests(prev => new Map(prev.set(subsystemId, 'pending')))

    try {
      // Request access token from Edge Gateway
      const response = await fetch('/api/auth/subsystem-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.sessionToken}`
        },
        body: JSON.stringify({
          subsystemId,
          userId: user.id,
          requestedScopes: getRequiredScopes(subsystemId, user.role)
        })
      })

      if (response.ok) {
        const { accessToken, expiresAt } = await response.json()
        setAccessRequests(prev => new Map(prev.set(subsystemId, 'granted')))
        onAccessGranted(subsystemId, accessToken)

        // Cache token for future use
        localStorage.setItem(`subsystem_${subsystemId}_token`, accessToken)
        localStorage.setItem(`subsystem_${subsystemId}_expires`, expiresAt)
      } else {
        const { reason } = await response.json()
        setAccessRequests(prev => new Map(prev.set(subsystemId, 'denied')))
        onAccessDenied(subsystemId, reason)
      }
    } catch (error) {
      setAccessRequests(prev => new Map(prev.set(subsystemId, 'denied')))
      onAccessDenied(subsystemId, 'Network error')
    }
  }

  const getRequiredScopes = (subsystemId: string, userRole: UserProfile['role']): string[] => {
    const scopeMatrix: Record<string, Partial<Record<UserProfile['role'], string[]>>> = {
      'places-venues': {
        'user': ['read:places', 'write:reservations'],
        'business': ['read:places', 'write:places', 'manage:reservations'],
        'admin': ['*']
      },
      'pap-marketing': {
        'user': ['read:campaigns'],
        'business': ['read:campaigns', 'write:campaigns', 'manage:consent'],
        'admin': ['*']
      },
      'matchmaking': {
        'user': ['read:matches', 'write:profile'],
        'business': ['read:matches', 'write:jobs', 'manage:contracts'],
        'admin': ['*']
      },
      'ecommerce': {
        'user': ['read:products', 'write:cart', 'manage:orders'],
        'business': ['read:products', 'write:products', 'manage:inventory'],
        'admin': ['*']
      }
    }

    return scopeMatrix[subsystemId]?.[userRole] ?? []
  }

  const getAccessStatus = (subsystemId: string) => {
    return accessRequests.get(subsystemId) || 'none'
  }

  return {
    requestSubsystemAccess,
    getAccessStatus,
    hasValidToken: (subsystemId: string) => {
      const token = localStorage.getItem(`subsystem_${subsystemId}_token`)
      const expires = localStorage.getItem(`subsystem_${subsystemId}_expires`)
      return token && expires && new Date(expires) > new Date()
    }
  }
}
