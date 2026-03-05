'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Alert, LoadingSpinner } from '@pulsco/admin-ui-core'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts'

interface COOMetrics {
  systemAvailability: number
  resourceUtilization: number
  operationalEfficiency: number
  costOptimization: number
  performanceLatency: number
  infrastructureHealth: number
  scalingEfficiency: number
  serviceLevelCompliance: number
}

interface OperationalAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  source: string
  timestamp: string
  affectedSystems: string[]
}

const FALLBACK_METRICS: COOMetrics = {
  systemAvailability: 99.7,
  resourceUtilization: 78.5,
  operationalEfficiency: 92.3,
  costOptimization: 15.2,
  performanceLatency: 245,
  infrastructureHealth: 96.8,
  scalingEfficiency: 88.9,
  serviceLevelCompliance: 98.4
}

const FALLBACK_ALERTS: OperationalAlert[] = [
  {
    id: '1',
    type: 'high',
    title: 'Resource Utilization Spike',
    description: 'CPU utilization exceeded 85% threshold for 15 minutes',
    source: 'Infrastructure Monitoring',
    timestamp: '45 minutes ago',
    affectedSystems: ['Web Servers', 'Database Cluster']
  },
  {
    id: '2',
    type: 'medium',
    title: 'Performance Latency Increase',
    description: 'Average response time increased by 22% in last hour',
    source: 'Application Performance',
    timestamp: '1 hour ago',
    affectedSystems: ['API Gateway', 'User Services']
  },
  {
    id: '3',
    type: 'low',
    title: 'Cost Optimization Opportunity',
    description: 'Identified $12K monthly savings through resource optimization',
    source: 'Cost Analytics',
    timestamp: '2 hours ago',
    affectedSystems: ['Cloud Infrastructure']
  }
]

export default function COODashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<COOMetrics | null>(null)
  const [alerts, setAlerts] = useState<OperationalAlert[]>([])
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    const loadOperationalData = async () => {
      try {
        const headers = { 'x-admin-role': 'coo' }
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
                title: anomaly.title || `Operational anomaly in ${anomaly.metric || 'signal'}`,
                description: anomaly.description || 'CSI detected an operational variance.',
                source: anomaly.source || 'CSI Intelligence',
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'now',
                affectedSystems: Array.isArray(anomaly.affectedSystems) ? anomaly.affectedSystems : []
              }))
            )
          } else {
            setAlerts(FALLBACK_ALERTS)
          }
        } else {
          setAlerts(FALLBACK_ALERTS)
        }
      } catch (error) {
        console.error('Failed to load COO intelligence', error)
        setMetrics(FALLBACK_METRICS)
        setAlerts(FALLBACK_ALERTS)
      } finally {
        setIsLoading(false)
      }
    }

    loadOperationalData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Chief Operating Officer Dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Chief Operating Officer Dashboard</h1>
                <p className="text-gray-600">Operational excellence, resource management, and system performance oversight</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">Resource Allocation</Button>
                <Button variant="danger" size="sm">Emergency Maintenance</Button>
                <Button variant="primary" size="sm">Performance Audit</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Operational Alerts */}
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
                        {alert.affectedSystems.length > 0 && ` • ${alert.affectedSystems.join(', ')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">Investigate</Button>
                    <Button size="sm" variant="primary">Resolve</Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Key Operational Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Availability</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.systemAvailability}%</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resource Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.resourceUtilization}%</p>
              </div>
              <Badge variant="warning">Monitor</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Operational Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.operationalEfficiency}%</p>
              </div>
              <Badge variant="success">Optimal</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance Latency</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.performanceLatency}ms</p>
              </div>
              <Badge variant="success">Good</Badge>
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
                Operational Overview
              </button>
              <button
                onClick={() => setActiveView('infrastructure')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'infrastructure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Infrastructure Health
              </button>
              <button
                onClick={() => setActiveView('performance')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'performance'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Performance Analytics
              </button>
              <button
                onClick={() => setActiveView('costs')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === 'costs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cost Optimization
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Operational Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="System Health Status">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Infrastructure Health</span>
                    <span className="font-medium text-green-600">{metrics?.infrastructureHealth}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Service Level Compliance</span>
                    <span className="font-medium text-blue-600">{metrics?.serviceLevelCompliance}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Scaling Efficiency</span>
                    <span className="font-medium text-green-600">{metrics?.scalingEfficiency}%</span>
                  </div>
                </div>
              </Card>

              <Card title="Resource Management">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">CPU Utilization</span>
                    <span className="font-medium text-orange-600">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Memory Usage</span>
                    <span className="font-medium text-blue-600">65%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Storage Capacity</span>
                    <span className="font-medium text-green-600">42%</span>
                  </div>
                </div>
              </Card>

              <Card title="Operational KPIs">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">MTTR (Mean Time to Recovery)</span>
                    <span className="font-medium text-green-600">4.2min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">MTBF (Mean Time Between Failures)</span>
                    <span className="font-medium text-blue-600">99.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Automation Coverage</span>
                    <span className="font-medium text-green-600">87%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeView === 'infrastructure' && (
          <div className="space-y-6">
            <Card title="Infrastructure Command Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Compute Resources</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Server Instances</span>
                        <Badge variant="success">247 Online</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Load Balancer Health</span>
                        <Badge variant="success">All Healthy</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Auto-scaling Events</span>
                        <Badge variant="info">3 in last hour</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Container Orchestration</span>
                        <span className="font-medium">Kubernetes 98.5%</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Storage & Database</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Database Connections</span>
                        <span className="font-medium text-green-600">1,247 active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Storage Utilization</span>
                        <span className="font-medium text-blue-600">42% of 50TB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Backup Status</span>
                        <Badge variant="success">Last: 2 hours ago</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Replication Lag</span>
                        <span className="font-medium text-green-600">12ms</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">⚙️</div>
                  <h3 className="text-sm font-medium text-gray-900">Infrastructure Operations Center</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Real-time monitoring, automated scaling, and infrastructure optimization controls
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'performance' && (
          <div className="space-y-6">
            <Card title="Performance Analytics Dashboard">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">245ms</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">99.7%</div>
                    <div className="text-sm text-gray-600">Uptime SLA</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">1,847</div>
                    <div className="text-sm text-gray-600">Requests/min</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-sm font-medium text-gray-900">Performance Monitoring</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Application performance metrics, bottleneck identification, and optimization recommendations
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'costs' && (
          <div className="space-y-6">
            <Card title="Cost Optimization Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Cost Breakdown</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Compute Costs</span>
                        <span className="font-medium">$47,231/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Storage Costs</span>
                        <span className="font-medium">$12,847/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Network Costs</span>
                        <span className="font-medium">$8,932/month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Monthly Cost</span>
                        <span className="font-medium text-blue-600">$69,010</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Optimization Opportunities</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Rightsizing Savings</span>
                        <Badge variant="success">$12,450</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Reserved Instances</span>
                        <Badge variant="success">$8,230</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Storage Optimization</span>
                        <Badge variant="warning">$3,120</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Total Potential Savings</span>
                        <span className="font-medium text-green-600">$23,800</span>
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
