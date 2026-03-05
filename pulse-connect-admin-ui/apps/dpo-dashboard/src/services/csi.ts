// DPO Dashboard CSI Service
// Handles privacy metrics, data subject requests and incident insights for the DPO role

import { AdminRoleType } from '@pulsco/admin-shared-types'

export interface DpoMetrics {
  privacyScore: number
  openIncidents: number
  dsrRequests: number
  piiRecordsCount: number
  encryptionCoverage: number
  retentionCompliance: number
  avgResponseTime: number
}

export interface PrivacyAnomaly {
  metric: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title?: string
  description: string
  confidence: number
  timestamp: Date
}

export class DPOCSIService {
  private readonly baseUrl: string
  private role: AdminRoleType = 'dpo'

  constructor(baseUrl = '/api/admin/intelligence') {
    this.baseUrl = baseUrl
  }

  async fetchDpoMetrics(timeRange?: { start: Date; end: Date }): Promise<DpoMetrics> {
    const params = new URLSearchParams({
      action: 'metrics',
      role: this.role
    })

    if (timeRange) {
      params.set('start', timeRange.start.toISOString())
      params.set('end', timeRange.end.toISOString())
    }

    const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': this.role,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch DPO metrics: ${response.status}`)
    }

    const payload = await response.json()
    const metrics = payload.metrics || payload.data || payload || {}

    return {
      privacyScore: metrics.privacy_score || metrics.privacyScore || 0,
      openIncidents: metrics.open_incidents || metrics.openIncidents || 0,
      dsrRequests: metrics.dsr_requests || metrics.dsrRequests || 0,
      piiRecordsCount: metrics.pii_records_count || metrics.piiRecordsCount || 0,
      encryptionCoverage: metrics.encryption_coverage || metrics.encryptionCoverage || 0,
      retentionCompliance: metrics.retention_compliance || metrics.retentionCompliance || 0,
      avgResponseTime: metrics.avg_response_time || metrics.avgResponseTime || 0
    }
  }

  async getPrivacyAnomalies(): Promise<PrivacyAnomaly[]> {
    const response = await fetch(`${this.baseUrl}?action=anomalies&role=${this.role}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': this.role,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch DPO anomalies: ${response.status}`)
    }

    const payload = await response.json()
    const anomalies = payload.anomalies || payload.data?.anomalies || []

    return anomalies.map((a: any) => ({
      metric: a.metric,
      severity: a.severity,
      title: a.title,
      description: a.description,
      confidence: a.confidence,
      timestamp: new Date(a.timestamp || Date.now())
    }))
  }
}

export default DPOCSIService
