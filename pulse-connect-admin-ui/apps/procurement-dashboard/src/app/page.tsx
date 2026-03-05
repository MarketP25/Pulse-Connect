'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Badge, Alert, LoadingSpinner } from '@pulsco/admin-ui-core'

interface ProcurementMetrics {
  costSavings: number
  supplierDiversity: number
  vendorSLACompliance: number
  partnershipRevenue: number
  procurementCosts: number
  vendorResponseTime: number
  contractRenewals: number
}

interface ProcurementAlert {
  id: string
  type: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  source: string
  timestamp: string
  priority: string
}

const FALLBACK_METRICS: ProcurementMetrics = {
  costSavings: 125000,
  supplierDiversity: 67,
  vendorSLACompliance: 96.8,
  partnershipRevenue: 2150000,
  procurementCosts: 874000,
  vendorResponseTime: 3.4,
  contractRenewals: 18
}

const FALLBACK_ALERTS: ProcurementAlert[] = [
  {
    id: '1',
    type: 'high',
    title: 'Contract Renewal Due',
    description: 'Major cloud services contract expires in 30 days',
    source: 'Contract Management',
    timestamp: '5 days ago',
    priority: 'High'
  }
]

export default function ProcurementDashboard() {
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<ProcurementMetrics | null>(null)
  const [alerts, setAlerts] = useState<ProcurementAlert[]>([])

  useEffect(() => {
    const loadProcurementData = async () => {
      try {
        const headers = { 'x-admin-role': 'procurement-partnerships' }
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
                title: anomaly.title || `Procurement anomaly in ${anomaly.metric || 'signal'}`,
                description: anomaly.description || 'CSI detected an unusual procurement signal.',
                source: anomaly.source || 'CSI Intelligence',
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : 'now',
                priority:
                  Number(anomaly.procurementImpact || anomaly.impactAmount || 0) > 50000
                    ? 'High'
                    : Number(anomaly.procurementImpact || anomaly.impactAmount || 0) > 25000
                      ? 'Medium'
                      : 'Low'
              }))
            )
          } else {
            setAlerts(FALLBACK_ALERTS)
          }
        } else {
          setAlerts(FALLBACK_ALERTS)
        }
      } catch (error) {
        console.error('Failed to load procurement intelligence', error)
        setMetrics(FALLBACK_METRICS)
        setAlerts(FALLBACK_ALERTS)
      } finally {
        setIsLoading(false)
      }
    }

    loadProcurementData()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Procurement Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Procurement Dashboard</h1>
                <p className="text-gray-600">Vendor management, partnership oversight, and procurement optimization</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">Contract Review</Button>
                <Button variant="danger" size="sm">Vendor Alert</Button>
                <Button variant="primary" size="sm">New RFP</Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.map(alert => (
              <Alert key={alert.id} type={alert.type === 'critical' ? 'error' : alert.type === 'high' ? 'warning' : 'info'}>
                <div className="flex justify-between items-center">
                  <div className="text-lg mr-3">
                    {alert.type === 'critical' ? '🚨' : alert.type === 'high' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {alert.source} • {alert.timestamp} • Priority: {alert.priority}
                    </p>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendor SLA Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.vendorSLACompliance}%</p>
              </div>
              <Badge variant="success">Strong</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Partnership Revenue</p>
                <p className="text-2xl font-bold text-gray-900">${metrics?.partnershipRevenue.toLocaleString()}</p>
              </div>
              <Badge variant="success">+15.2%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Procurement Costs</p>
                <p className="text-2xl font-bold text-gray-900">${metrics?.procurementCosts.toLocaleString()}</p>
              </div>
              <Badge variant="warning">-2.1%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vendor Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.vendorResponseTime} hrs</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>
        </div>

        <Card title="Procurement Performance Overview">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{metrics?.supplierDiversity}%</div>
                <div className="text-sm text-gray-600">Supplier Diversity Score</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics?.contractRenewals}</div>
                <div className="text-sm text-gray-600">Contracts Due for Renewal</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">${metrics?.costSavings.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Cost Savings This Quarter</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
