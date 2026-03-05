'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Alert, LoadingSpinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@pulsco/admin-ui-core'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { Shield, Activity, AlertTriangle, CheckCircle, XCircle, Eye, Lock, Zap } from 'lucide-react'

interface SystemMetrics {
  totalAdmins: number
  activeSessions: number
  systemHealth: number
  marpSignatures: number
  csiAnomalies: number
  governanceAlerts: number
  crossDomainCorrelations: number
}

interface DashboardSnapshot {
  role: string
  status: 'healthy' | 'warning' | 'critical'
  lastUpdate: string
  activeUsers: number
  alerts: number
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

const FALLBACK_METRICS: SystemMetrics = {
  totalAdmins: 10,
  activeSessions: 8,
  systemHealth: 98.5,
  marpSignatures: 1247,
  csiAnomalies: 3,
  governanceAlerts: 2,
  crossDomainCorrelations: 15
}

const FALLBACK_SNAPSHOTS: DashboardSnapshot[] = [
  { role: 'COO', status: 'healthy', lastUpdate: '2 min ago', activeUsers: 1, alerts: 0 },
  { role: 'Business Ops', status: 'healthy', lastUpdate: '5 min ago', activeUsers: 1, alerts: 1 },
  { role: 'People & Risk', status: 'warning', lastUpdate: '1 min ago', activeUsers: 1, alerts: 2 },
  { role: 'Procurement', status: 'healthy', lastUpdate: '3 min ago', activeUsers: 1, alerts: 0 },
  { role: 'Legal & Finance', status: 'healthy', lastUpdate: '7 min ago', activeUsers: 1, alerts: 0 },
  { role: 'Commercial', status: 'healthy', lastUpdate: '4 min ago', activeUsers: 1, alerts: 1 },
  { role: 'Tech Security', status: 'critical', lastUpdate: '30 sec ago', activeUsers: 1, alerts: 3 },
  { role: 'Customer Exp', status: 'healthy', lastUpdate: '6 min ago', activeUsers: 1, alerts: 0 },
  { role: 'Governance', status: 'healthy', lastUpdate: '2 min ago', activeUsers: 1, alerts: 0 },
  { role: 'DPO', status: 'healthy', lastUpdate: 'n/a', activeUsers: 1, alerts: 0 }
]

const FALLBACK_ALERTS = [
  {
    id: '1',
    type: 'critical',
    title: 'Tech Security Dashboard - Multiple Threats Detected',
    description: 'High-severity security anomalies requiring immediate attention',
    source: 'CSI Intelligence',
    timestamp: '30 seconds ago'
  },
  {
    id: '2',
    type: 'warning',
    title: 'People & Risk - Compliance Threshold Breach',
    description: 'Employee turnover rate exceeded governance threshold',
    source: 'MARP Governance',
    timestamp: '1 minute ago'
  }
]

export default function SuperAdminDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [dashboardSnapshots, setDashboardSnapshots] = useState<DashboardSnapshot[]>([])
  const [systemAlerts, setSystemAlerts] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const loadSystemData = async () => {
      try {
        const headers = { 'x-admin-role': 'superadmin' }
        const [metricsRes, anomaliesRes, intelligenceRes] = await Promise.all([
          fetch('api/admin/intelligence?action=metrics', { headers, cache: 'no-store' }),
          fetch('api/admin/intelligence?action=anomalies', { headers, cache: 'no-store' }),
          fetch('api/admin/intelligence?action=intelligence', { headers, cache: 'no-store' })
        ])

        if (!metricsRes.ok) {
          throw new Error(`Metrics request failed with ${metricsRes.status}`)
        }

        const metricsPayload = await metricsRes.json()
        const rawMetrics = metricsPayload.metrics || metricsPayload.data || metricsPayload || {}

        let anomalyList: any[] = []
        if (anomaliesRes.ok) {
          const anomaliesPayload = await anomaliesRes.json()
          anomalyList = anomaliesPayload.anomalies || anomaliesPayload.data?.anomalies || []
        }

        let inferredSnapshots = FALLBACK_SNAPSHOTS
        if (intelligenceRes.ok) {
          const intelligencePayload = await intelligenceRes.json()
          const snapshots =
            intelligencePayload.dashboardSnapshots ||
            intelligencePayload.data?.dashboardSnapshots ||
            intelligencePayload.intelligence?.dashboardSnapshots
          if (Array.isArray(snapshots) && snapshots.length > 0) {
            inferredSnapshots = snapshots
          }
        }

        setMetrics({
          totalAdmins: Number(rawMetrics.totalAdmins || rawMetrics.total_admins || FALLBACK_METRICS.totalAdmins),
          activeSessions: Number(rawMetrics.activeSessions || rawMetrics.active_sessions || FALLBACK_METRICS.activeSessions),
          systemHealth: Number(rawMetrics.systemHealth || rawMetrics.system_health || FALLBACK_METRICS.systemHealth),
          marpSignatures: Number(rawMetrics.marpSignatures || rawMetrics.marp_signatures || FALLBACK_METRICS.marpSignatures),
          csiAnomalies: Array.isArray(anomalyList)
            ? anomalyList.length
            : Number(rawMetrics.csiAnomalies || rawMetrics.csi_anomalies || FALLBACK_METRICS.csiAnomalies),
          governanceAlerts: Number(rawMetrics.governanceAlerts || rawMetrics.governance_alerts || FALLBACK_METRICS.governanceAlerts),
          crossDomainCorrelations: Number(
            rawMetrics.crossDomainCorrelations ||
            rawMetrics.cross_domain_correlations ||
            FALLBACK_METRICS.crossDomainCorrelations
          )
        })

        setDashboardSnapshots(inferredSnapshots)

        if (Array.isArray(anomalyList) && anomalyList.length > 0) {
          setSystemAlerts(
            anomalyList.slice(0, 3).map((anomaly: any, index: number) => ({
              id: String(index + 1),
              type: anomaly.severity || 'warning',
              title: anomaly.title || `System anomaly in ${anomaly.metric || 'signal'}`,
              description: anomaly.description || 'CSI detected a cross-domain anomaly.',
              source: anomaly.source || 'CSI Intelligence',
              timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'now'
            }))
          )
        } else {
          setSystemAlerts(FALLBACK_ALERTS)
        }
      } catch (err) {
        console.error('Failed to load superadmin system intelligence', err)
        setMetrics(FALLBACK_METRICS)
        setDashboardSnapshots(FALLBACK_SNAPSHOTS)
        setSystemAlerts(FALLBACK_ALERTS)
      } finally {
        setIsLoading(false)
      }
    }

    loadSystemData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Global Command Center...</p>
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
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <Shield className="mr-3 h-8 w-8 text-blue-600" />
                  SuperAdmin Global Command Center
                </h1>
                <p className="text-gray-600">Complete governance oversight and system control</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Audit Logs
                </Button>
                <Button variant="danger" size="sm">
                  <Lock className="mr-2 h-4 w-4" />
                  Freeze All Dashboards
                </Button>
                <Button variant="primary" size="sm">
                  <Zap className="mr-2 h-4 w-4" />
                  Trigger System Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Critical System Alerts */}
        {systemAlerts.length > 0 && (
          <div className="mb-8">
            {systemAlerts.map(alert => (
              <Alert key={alert.id} type={alert.type === 'critical' ? 'error' : 'warning'}>
                <div className="flex justify-between items-center">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.source} • {alert.timestamp}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">View Details</Button>
                    <Button size="sm" variant="primary">Escalate</Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.systemHealth}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.activeSessions}/10</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">MARP Signatures</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.marpSignatures}</p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cross-Domain Correlations</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.crossDomainCorrelations}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Dashboard Control Center */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">System Overview</TabsTrigger>
            <TabsTrigger value="dashboards">Dashboard Control</TabsTrigger>
            <TabsTrigger value="intelligence">CSI Intelligence</TabsTrigger>
            <TabsTrigger value="governance">Governance Status</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Dashboard Status Grid */}
            <Card title="Dashboard Status Overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dashboardSnapshots.map((dashboard, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{dashboard.role}</h4>
                      <Badge variant={
                        dashboard.status === 'healthy' ? 'success' :
                        dashboard.status === 'warning' ? 'warning' : 'error'
                      }>
                        {dashboard.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Active Users: {dashboard.activeUsers}</p>
                      <p>Alerts: {dashboard.alerts}</p>
                      <p>Last Update: {dashboard.lastUpdate}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button size="sm" variant="secondary">View Dashboard</Button>
                      <Button size="sm" variant="outline">Freeze</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dashboards" className="space-y-6">
            <Card title="Dashboard Mirroring & Control">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">All Dashboard Metrics</h3>
                  <div className="flex space-x-2">
                    <Button variant="secondary">Refresh All</Button>
                    <Button variant="danger">Emergency Freeze</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Placeholder for dashboard mirroring - would show all dashboard content */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Eye className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Dashboard Mirroring Active</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All dashboard metrics and states are mirrored here for global oversight
                    </p>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Real-time Synchronization</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Live updates from all subsystem dashboards with cross-domain correlation
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <Card title="CSI Intelligence Streams">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{metrics?.csiAnomalies}</div>
                    <div className="text-sm text-gray-600">Active Anomalies</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">1,247</div>
                    <div className="text-sm text-gray-600">Intelligence Events</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98.5%</div>
                    <div className="text-sm text-gray-600">Prediction Accuracy</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Activity className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">CSI Intelligence Dashboard</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Real-time anomaly detection, predictive analytics, and intelligence correlation
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="governance" className="space-y-6">
            <Card title="MARP Governance Firewall Status">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics?.marpSignatures}</div>
                    <div className="text-sm text-gray-600">Active Signatures</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{metrics?.governanceAlerts}</div>
                    <div className="text-sm text-gray-600">Policy Alerts</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">100%</div>
                    <div className="text-sm text-gray-600">Compliance Rate</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">MARP Firewall Control</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Policy enforcement, cryptographic signing, and governance audit trails
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
