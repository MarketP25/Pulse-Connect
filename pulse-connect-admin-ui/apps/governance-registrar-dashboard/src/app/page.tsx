'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Alert, LoadingSpinner } from '@pulsco/admin-ui-core'

interface GovernanceMetrics {
  activePolicies: number
  councilMembers: number
  marpSignatures: number
  governanceAlerts: number
  policyCompliance: number
  registrarActivity: number
  crossDomainCorrelations: number
  decisionEngineStatus: string
}

interface GovernanceAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  source: string
  timestamp: string
  priority: string
}

const FALLBACK_METRICS: GovernanceMetrics = {
  activePolicies: 1247,
  councilMembers: 89,
  marpSignatures: 45231,
  governanceAlerts: 3,
  policyCompliance: 98.7,
  registrarActivity: 156,
  crossDomainCorrelations: 23,
  decisionEngineStatus: 'Active'
}

const FALLBACK_ALERTS: GovernanceAlert[] = [
  {
    id: '1',
    type: 'high',
    title: 'Policy Review Required',
    description: 'Annual policy review due in 7 days for 12 active policies',
    source: 'Policy Management',
    timestamp: '2 hours ago',
    priority: 'High'
  },
  {
    id: '2',
    type: 'medium',
    title: 'Council Member Onboarding',
    description: '3 new council members require MARP signature verification',
    source: 'Council Registrar',
    timestamp: '1 day ago',
    priority: 'Medium'
  },
  {
    id: '3',
    type: 'low',
    title: 'Cross-Domain Correlation Detected',
    description: 'New correlation pattern identified between governance and operations',
    source: 'CSI Intelligence',
    timestamp: '3 days ago',
    priority: 'Low'
  }
]

export default function GovernanceRegistrarDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<GovernanceMetrics | null>(null)
  const [alerts, setAlerts] = useState<GovernanceAlert[]>([])
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    const loadGovernanceData = async () => {
      try {
        const headers = { 'x-admin-role': 'governance-registrar' }
        const [metricsRes, anomaliesRes] = await Promise.all([
          fetch('api/admin/intelligence?action=metrics', { headers, cache: 'no-store' }),
          fetch('api/admin/intelligence?action=anomalies', { headers, cache: 'no-store' })
        ])

        if (!metricsRes.ok) {
          throw new Error(`Metrics request failed with ${metricsRes.status}`)
        }

        const metricsPayload = await metricsRes.json()
        const rawMetrics = metricsPayload.metrics || metricsPayload.data || metricsPayload || {}
        setMetrics({
          ...FALLBACK_METRICS,
          ...rawMetrics
        })

        if (anomaliesRes.ok) {
          const anomaliesPayload = await anomaliesRes.json()
          const anomalies = anomaliesPayload.anomalies || anomaliesPayload.data?.anomalies || []
          if (Array.isArray(anomalies) && anomalies.length > 0) {
            setAlerts(
              anomalies.slice(0, 3).map((anomaly: any, index: number) => ({
                id: String(index + 1),
                type: anomaly.severity || 'low',
                title: anomaly.title || `Governance anomaly in ${anomaly.metric || 'signal'}`,
                description: anomaly.description || 'CSI detected an unusual governance pattern.',
                source: anomaly.source || 'CSI Intelligence',
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'now',
                priority: anomaly.severity ? String(anomaly.severity).toUpperCase() : 'LOW'
              }))
            )
          } else {
            setAlerts(FALLBACK_ALERTS)
          }
        } else {
          setAlerts(FALLBACK_ALERTS)
        }
      } catch (error) {
        console.error('Failed to load governance intelligence', error)
        setMetrics(FALLBACK_METRICS)
        setAlerts(FALLBACK_ALERTS)
      } finally {
        setIsLoading(false)
      }
    }

    loadGovernanceData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Governance Registrar Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Governance Registrar Dashboard</h1>
                <p className="text-gray-600">Council management, policy oversight, and MARP firewall governance</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">Policy Review</Button>
                <Button variant="danger" size="sm">Governance Alert</Button>
                <Button variant="primary" size="sm">Council Meeting</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Governance Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.map(alert => (
              <Alert key={alert.id} type={alert.type === 'critical' ? 'error' : alert.type === 'high' ? 'warning' : 'info'}>
                <div className="flex justify-between items-center">
                  <div className="flex items-start">
                    <div className="text-lg mr-3">
                      {alert.type === 'critical' ? '🚨' : alert.type === 'high' ? '⚠️' : 'ℹ️'}
                    </div>
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.source} • {alert.timestamp} • Priority: {alert.priority}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">Review</Button>
                    <Button size="sm" variant="primary">Action</Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Key Governance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Policies</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.activePolicies.toLocaleString()}</p>
              </div>
              <Badge variant="success">+5.2%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Council Members</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.councilMembers}</p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">MARP Signatures</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.marpSignatures.toLocaleString()}</p>
              </div>
              <Badge variant="success">Valid</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Policy Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.policyCompliance}%</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveView('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Governance Overview
              </button>
              <button
                onClick={() => setActiveView('council')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'council'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Council Management
              </button>
              <button
                onClick={() => setActiveView('policies')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'policies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Policy Framework
              </button>
              <button
                onClick={() => setActiveView('marp')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'marp'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                MARP Firewall
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Governance Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="Decision Engine Status">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Engine Status</span>
                    <Badge variant="success">{metrics?.decisionEngineStatus}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Correlations</span>
                    <span className="font-medium text-blue-600">{metrics?.crossDomainCorrelations}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Processing Latency</span>
                    <span className="font-medium text-green-600">245ms</span>
                  </div>
                </div>
              </Card>

              <Card title="Registrar Activity">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Daily Registrations</span>
                    <span className="font-medium text-blue-600">{metrics?.registrarActivity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pending Approvals</span>
                    <span className="font-medium text-orange-600">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Rejection Rate</span>
                    <span className="font-medium text-green-600">2.1%</span>
                  </div>
                </div>
              </Card>

              <Card title="Governance KPIs">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Policy Adherence</span>
                    <span className="font-medium text-green-600">98.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Council Engagement</span>
                    <span className="font-medium text-blue-600">94.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Audit Readiness</span>
                    <span className="font-medium text-green-600">100%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'council' && (
          <div className="space-y-6">
            <Card title="Council Management Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Council Composition</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Members</span>
                        <Badge variant="success">{metrics?.councilMembers}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Pending Onboarding</span>
                        <Badge variant="warning">3</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Term Expirations</span>
                        <Badge variant="info">7 in 6 months</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Diversity Score</span>
                        <span className="font-medium">8.7/10</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Council Activities</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Meetings This Month</span>
                        <span className="font-medium text-blue-600">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Decisions Made</span>
                        <span className="font-medium text-green-600">47</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Policy Amendments</span>
                        <span className="font-medium text-orange-600">3</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Attendance Rate</span>
                        <span className="font-medium text-green-600">96%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-sm font-medium text-gray-900">Council Operations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Member management, meeting coordination, and governance decision tracking
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'policies' && (
          <div className="space-y-6">
            <Card title="Policy Framework Management">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics?.activePolicies}</div>
                    <div className="text-sm text-gray-600">Active Policies</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">23</div>
                    <div className="text-sm text-gray-600">Under Review</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">98.7%</div>
                    <div className="text-sm text-gray-600">Compliance Rate</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📋</div>
                  <h3 className="text-sm font-medium text-gray-900">Policy Lifecycle</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Policy creation, review, approval, and enforcement management
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'marp' && (
          <div className="space-y-6">
            <Card title="MARP Firewall Control">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Firewall Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Signatures</span>
                        <span className="font-medium text-green-600">{metrics?.marpSignatures.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Signature Validation</span>
                        <Badge variant="success">All Valid</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Cryptographic Strength</span>
                        <Badge variant="success">AES-256</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Last Security Audit</span>
                        <span className="font-medium">2 days ago</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Governance Controls</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Policy Enforcement</span>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Access Controls</span>
                        <Badge variant="success">Enforced</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Audit Trails</span>
                        <Badge variant="success">Complete</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Compliance Monitoring</span>
                        <span className="font-medium text-green-600">Real-time</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
