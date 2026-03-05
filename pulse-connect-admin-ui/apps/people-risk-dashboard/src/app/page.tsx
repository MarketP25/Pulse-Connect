'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Alert, LoadingSpinner } from '@pulsco/admin-ui-core'

interface PeopleRiskMetrics {
  employeeSatisfactionScore: number
  turnoverRate: number
  absenteeismRate: number
  trainingCompletionRate: number
  diversityInclusionScore: number
  complianceTrainingRate: number
  riskIncidents: number
  harassmentReports: number
  performanceReviewCompletion: number
  talentAcquisitionTime: number
}

interface HRAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  source: string
  timestamp: string
  affectedEmployees: number
}

const FALLBACK_METRICS: PeopleRiskMetrics = {
  employeeSatisfactionScore: 4.1,
  turnoverRate: 2.1,
  absenteeismRate: 3.2,
  trainingCompletionRate: 87,
  diversityInclusionScore: 8.2,
  complianceTrainingRate: 94,
  riskIncidents: 3,
  harassmentReports: 0,
  performanceReviewCompletion: 92,
  talentAcquisitionTime: 28
}

const FALLBACK_ALERTS: HRAlert[] = [
  {
    id: '1',
    type: 'high',
    title: 'Employee Turnover Rate Increasing',
    description: 'Turnover rate exceeded 2% threshold in engineering department',
    source: 'HR Analytics',
    timestamp: '2 hours ago',
    affectedEmployees: 12
  },
  {
    id: '2',
    type: 'medium',
    title: 'Compliance Training Due',
    description: 'GDPR training expires for 156 employees in 7 days',
    source: 'Compliance System',
    timestamp: '4 hours ago',
    affectedEmployees: 156
  },
  {
    id: '3',
    type: 'low',
    title: 'Performance Reviews Pending',
    description: '8% of quarterly performance reviews are overdue',
    source: 'Performance Management',
    timestamp: '1 day ago',
    affectedEmployees: 24
  }
]

export default function PeopleRiskDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<PeopleRiskMetrics | null>(null)
  const [alerts, setAlerts] = useState<HRAlert[]>([])
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    const loadPeopleData = async () => {
      try {
        const headers = { 'x-admin-role': 'people-risk' }
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
                type: anomaly.severity || 'medium',
                title: anomaly.title || `People-risk anomaly in ${anomaly.metric || 'signal'}`,
                description: anomaly.description || 'CSI detected an HR/risk anomaly.',
                source: anomaly.source || 'CSI Intelligence',
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'now',
                affectedEmployees: Number(anomaly.affectedEmployees || anomaly.impactCount || 0)
              }))
            )
          } else {
            setAlerts(FALLBACK_ALERTS)
          }
        } else {
          setAlerts(FALLBACK_ALERTS)
        }
      } catch (error) {
        console.error('Failed to load people-risk intelligence', error)
        setMetrics(FALLBACK_METRICS)
        setAlerts(FALLBACK_ALERTS)
      } finally {
        setIsLoading(false)
      }
    }

    loadPeopleData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading People & Risk Dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">People & Risk Dashboard</h1>
                <p className="text-gray-600">Employee experience, risk management, and organizational health</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">Employee Survey</Button>
                <Button variant="danger" size="sm">Risk Assessment</Button>
                <Button variant="primary" size="sm">Talent Acquisition</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HR & Risk Alerts */}
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
                        {alert.source} • {alert.timestamp}
                        {alert.affectedEmployees > 0 && ` • ${alert.affectedEmployees} employees affected`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">Investigate</Button>
                    <Button size="sm" variant="primary">Action Plan</Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Key People & Risk Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Employee Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.employeeSatisfactionScore}/5.0</p>
              </div>
              <Badge variant="success">Good</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.turnoverRate}%</p>
              </div>
              <Badge variant="warning">Monitor</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Training Completion</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.trainingCompletionRate}%</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Risk Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.riskIncidents}</p>
              </div>
              <Badge variant="success">Low</Badge>
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
                People Overview
              </button>
              <button
                onClick={() => setActiveView('risk')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'risk'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Risk Management
              </button>
              <button
                onClick={() => setActiveView('talent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'talent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Talent & Development
              </button>
              <button
                onClick={() => setActiveView('compliance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'compliance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Compliance & Safety
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Employee Experience Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="Employee Well-being">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Work-Life Balance</span>
                    <span className="font-medium text-green-600">4.2/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Stress Levels</span>
                    <span className="font-medium text-yellow-600">Medium</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Engagement Score</span>
                    <span className="font-medium text-blue-600">78%</span>
                  </div>
                </div>
              </Card>

              <Card title="Diversity & Inclusion">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">D&I Score</span>
                    <span className="font-medium text-green-600">{metrics?.diversityInclusionScore}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Gender Balance</span>
                    <span className="font-medium text-blue-600">52/48</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Inclusive Culture</span>
                    <span className="font-medium text-green-600">8.7/10</span>
                  </div>
                </div>
              </Card>

              <Card title="Performance & Growth">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Review Completion</span>
                    <span className="font-medium text-green-600">{metrics?.performanceReviewCompletion}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Promotion Rate</span>
                    <span className="font-medium text-blue-600">12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Skill Development</span>
                    <span className="font-medium text-green-600">89%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'risk' && (
          <div className="space-y-6">
            <Card title="Risk Management Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Risk Assessment</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Risk Incidents</span>
                        <Badge variant="warning">{metrics?.riskIncidents}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Harassment Reports</span>
                        <Badge variant="success">{metrics?.harassmentReports}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Data Breach Risk</span>
                        <Badge variant="success">Low</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Compliance Violations</span>
                        <Badge variant="success">0</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Risk Mitigation</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Training Programs</span>
                        <span className="font-medium text-green-600">12 Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Policy Updates</span>
                        <span className="font-medium text-blue-600">3 Pending</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Audit Schedule</span>
                        <span className="font-medium text-green-600">On Track</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Incident Response</span>
                        <span className="font-medium text-green-600">Tested</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🛡️</div>
                  <h3 className="text-sm font-medium text-gray-900">Risk Control Center</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Comprehensive risk assessment, mitigation strategies, and compliance monitoring
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'talent' && (
          <div className="space-y-6">
            <Card title="Talent Management Hub">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{metrics?.talentAcquisitionTime}</div>
                    <div className="text-sm text-gray-600">Days to Hire</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">247</div>
                    <div className="text-sm text-gray-600">Open Positions</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">89%</div>
                    <div className="text-sm text-gray-600">Offer Acceptance</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-sm font-medium text-gray-900">Talent Acquisition</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Recruitment pipeline, candidate experience, and talent development programs
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'compliance' && (
          <div className="space-y-6">
            <Card title="Compliance & Safety Dashboard">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Compliance Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Training Completion</span>
                        <span className="font-medium text-green-600">{metrics?.complianceTrainingRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Policy Acknowledgment</span>
                        <span className="font-medium text-green-600">96%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Audit Readiness</span>
                        <Badge variant="success">Compliant</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Regulatory Updates</span>
                        <Badge variant="info">2 Pending</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Workplace Safety</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Incident Rate</span>
                        <span className="font-medium text-green-600">0.02 per 100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Safety Training</span>
                        <span className="font-medium text-green-600">94% Complete</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Equipment Checks</span>
                        <Badge variant="success">All Passed</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Emergency Drills</span>
                        <Badge variant="success">Scheduled</Badge>
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
