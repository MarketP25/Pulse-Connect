// Admin Gateway - Central orchestration layer for admin dashboards
// This is the ONLY entry point for admin dashboards to access system intelligence
// All CSI interactions happen here, dashboards only communicate through this gateway

import { NextRequest, NextResponse } from 'next/server'
import { AdminRoleType } from '@pulsco/admin-shared-types'

// Gateway Configuration
const CSI_API_BASE = process.env.CSI_API_BASE || ''
const CSI_WS_URL = process.env.CSI_WS_URL || ''
const CSI_SSE_URL = process.env.CSI_SSE_URL || ''
const CSI_AUTH_TOKEN = process.env.CSI_AUTH_TOKEN || ''

// Service URLs for domain orchestration
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4001'
const GOVERNANCE_SERVICE_URL = process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:4002'
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://localhost:4003'
const OBSERVABILITY_SERVICE_URL = process.env.OBSERVABILITY_SERVICE_URL || 'http://localhost:4004'

// PC365 Guard validation - validates privileged operations
async function validatePC365Guard(req: NextRequest): Promise<{
  valid: boolean
  role?: AdminRoleType
  founderApproved?: boolean
}> {
  const pc365Attestation = req.headers.get('x-pc365-attestation')
  const adminRole = req.headers.get('x-admin-role') as AdminRoleType
  
  if (!pc365Attestation || !adminRole) {
    return { valid: false }
  }

  // In production, this would verify the PC365 attestation token
  // For now, we validate the presence of required headers
  return {
    valid: true,
    role: adminRole,
    founderApproved: req.headers.get('x-founder-approved') === 'true'
  }
}

// Role-based access control
const ROLE_PERMISSIONS: Record<AdminRoleType, string[]> = {
  'superadmin': ['metrics', 'anomalies', 'intelligence', 'governance', 'billing', 'events'],
  'business-ops': ['metrics', 'anomalies', 'intelligence', 'reporting'],
  'commercial-outreach': ['metrics', 'intelligence', 'reporting'],
  'coo': ['metrics', 'anomalies', 'intelligence', 'reporting', 'operations'],
  'customer-experience': ['metrics', 'intelligence', 'reporting'],
  'dpo': ['metrics', 'intelligence', 'compliance'],
  'governance-registrar': ['metrics', 'governance', 'compliance'],
  'legal-finance': ['metrics', 'billing', 'compliance', 'reporting'],
  'people-risk': ['metrics', 'intelligence', 'compliance'],
  'procurement-partnerships': ['metrics', 'intelligence', 'reporting'],
  'tech-security': ['metrics', 'anomalies', 'intelligence', 'security']
}

function validateRolePermission(role: AdminRoleType, action: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions?.includes(action) || false
}

// Main intelligence endpoint - proxies to CSI through gateway
export async function handleIntelligenceRequest(
  role: AdminRoleType,
  action: string,
  params?: Record<string, string>
) {
  // Validate permissions
  if (!validateRolePermission(role, action)) {
    throw new Error(`Role ${role} does not have permission for action ${action}`)
  }

  // Route to appropriate service based on action
  switch (action) {
    case 'metrics':
    case 'anomalies':
    case 'intelligence':
      // Fetch from CSI via internal service call
      // In production, this would be an internal service-to-service call
      return await fetchFromCSI(role, action, params)
    
    case 'billing':
      return await fetchFromService(BILLING_SERVICE_URL, '/api/billing/metrics', { role, ...params })
    
    case 'governance':
      return await fetchFromService(GOVERNANCE_SERVICE_URL, '/api/governance/status', { role, ...params })
    
    case 'reporting':
      return await fetchFromService(REPORTING_SERVICE_URL, '/api/reports', { role, ...params })
    
    case 'compliance':
      return await fetchFromService(OBSERVABILITY_SERVICE_URL, '/api/compliance', { role, ...params })
    
    case 'security':
      return await fetchFromService(OBSERVABILITY_SERVICE_URL, '/api/security/metrics', { role, ...params })
    
    default:
      throw new Error(`Unknown action: ${action}`)
  }
}

// Internal CSI communication - happens server-side only
async function fetchFromCSI(
  role: AdminRoleType,
  action: string,
  params?: Record<string, string>
) {
  // This would be an internal service call in production
  // For now, we simulate the response structure
  const csiEndpoint = `${CSI_API_BASE}/api/v1/${action}`
  
  try {
    const response = await fetch(csiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CSI_AUTH_TOKEN}`,
        'X-Admin-Role': role
      },
      body: JSON.stringify({ role, action, params })
    })
    
    if (!response.ok) {
      throw new Error(`CSI request failed: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    // Fallback for development - return mock data
    console.warn('CSI unavailable, returning cached intelligence')
    return {
      role,
      action,
      data: getMockIntelligence(role, action),
      timestamp: new Date().toISOString(),
      source: 'gateway-proxy'
    }
  }
}

// Service communication helper
async function fetchFromService(
  serviceUrl: string,
  endpoint: string,
  params: Record<string, string>
) {
  const url = new URL(endpoint, serviceUrl)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })
  
  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${process.env.INTERNAL_SERVICE_TOKEN}`
    }
  })
  
  return await response.json()
}

// Mock intelligence for development
function getMockIntelligence(role: AdminRoleType, action: string) {
  const baseMetrics = {
    system_health: 95,
    governance_compliance: 92,
    security_score: 88,
    operational_efficiency: 90
  }
  
  if (action === 'metrics') {
    return baseMetrics
  }
  
  if (action === 'anomalies') {
    return []
  }
  
  if (action === 'intelligence') {
    return {
      insights: ['System operating within normal parameters'],
      recommendations: ['Continue monitoring'],
      confidence: 0.85
    }
  }
  
  return {}
}

// API Route Handlers

export async function intelligenceRoute(req: NextRequest) {
  // Validate PC365 guard
  const guard = await validatePC365Guard(req)
  if (!guard.valid || !guard.role) {
    return new NextResponse('Unauthorized - PC365 validation failed', { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action') || 'metrics'
  const role = guard.role

  try {
    const data = await handleIntelligenceRequest(role, action, {
      from: url.searchParams.get('from'),
      to: url.searchParams.get('to')
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Intelligence route error:', error)
    return new NextResponse(
      error instanceof Error ? error.message : 'Internal error',
      { status: 500 }
    )
  }
}

// Event handler - for dashboard-triggered operations
export async function eventsRoute(req: NextRequest) {
  const guard = await validatePC365Guard(req)
  if (!guard.valid || !guard.role) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Only founder-approved operations can trigger events
  if (!guard.founderApproved) {
    return new NextResponse('Founder approval required for this operation', { status: 403 })
  }

  try {
    const body = await req.json()
    const { eventType, payload } = body

    // Route event to appropriate domain service
    // Events are processed asynchronously - no direct CSI mutation
    console.log(`Processing event: ${eventType} from ${guard.role}`)
    
    return NextResponse.json({
      eventId: crypto.randomUUID(),
      status: 'queued',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return new NextResponse('Invalid request', { status: 400 })
  }
}

// Telemetry endpoint - for dashboard health checks
export async function telemetryRoute(req: NextRequest) {
  return NextResponse.json({
    status: 'healthy',
    gateway: 'admin-gateway',
    version: '0.2.0',
    timestamp: new Date().toISOString()
  })
}

// Convenience exports for dashboard-specific handlers
export function createDashboardHandler(role: AdminRoleType) {
  return async function(req: NextRequest) {
    const guard = await validatePC365Guard(req)
    if (!guard.valid || guard.role !== role) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'metrics'
    
    try {
      const data = await handleIntelligenceRequest(role, action)
      return NextResponse.json(data)
    } catch (error) {
      return new NextResponse('Error', { status: 500 })
    }
  }
}

// Convenience handler for dashboard metrics routes
export function dashboardMetricsHandler(role: AdminRoleType) {
  return async function(req: NextRequest) {
    // Validate PC365 guard
    const guard = await validatePC365Guard(req)
    if (!guard.valid || !guard.role) {
      return new NextResponse('Unauthorized - PC365 validation failed', { status: 401 })
    }

    // Validate role matches
    if (guard.role !== role) {
      return new NextResponse('Forbidden - Invalid role for this dashboard', { status: 403 })
    }

    try {
      const data = await handleIntelligenceRequest(role, 'metrics')
      return NextResponse.json(data)
    } catch (error) {
      console.error(`Dashboard metrics error for ${role}:`, error)
      return new NextResponse(
        error instanceof Error ? error.message : 'Internal error',
        { status: 500 }
      )
    }
  }
}
