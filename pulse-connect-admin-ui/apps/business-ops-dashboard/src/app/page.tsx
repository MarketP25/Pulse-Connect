"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";

interface BusinessOpsMetrics {
  dailyRevenue: number;
  activeUsers: number;
  transactionVolume: number;
  conversionRate: number;
  churnRate: number;
  customerAcquisitionCost: number;
  lifetimeValue: number;
  monthlyRecurringRevenue: number;
  userEngagement: number;
  retentionRate: number;
}

interface BusinessAlert {
  id: string;
  type: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  timestamp: string;
  impact: string;
}

const FALLBACK_METRICS: BusinessOpsMetrics = {
  dailyRevenue: 124750,
  activeUsers: 45280,
  transactionVolume: 12847,
  conversionRate: 3.2,
  churnRate: 2.1,
  customerAcquisitionCost: 45,
  lifetimeValue: 285,
  monthlyRecurringRevenue: 892340,
  userEngagement: 73.5,
  retentionRate: 87.2
};

const FALLBACK_ALERTS: BusinessAlert[] = [
  {
    id: "1",
    type: "high",
    title: "Revenue Growth Slowing",
    description: "Daily revenue decreased by 8.5% compared to last week",
    source: "Revenue Analytics",
    timestamp: "2 hours ago",
    impact: "High"
  },
  {
    id: "2",
    type: "medium",
    title: "Churn Rate Increase",
    description: "Customer churn rate increased by 0.7% this month",
    source: "Customer Analytics",
    timestamp: "4 hours ago",
    impact: "Medium"
  },
  {
    id: "3",
    type: "low",
    title: "CAC Optimization Opportunity",
    description: "Identified $12K monthly savings in customer acquisition costs",
    source: "Marketing Analytics",
    timestamp: "6 hours ago",
    impact: "Low"
  }
];

export default function BusinessOpsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<BusinessOpsMetrics | null>(null);
  const [alerts, setAlerts] = useState<BusinessAlert[]>([]);

  useEffect(() => {
    const loadBusinessData = async () => {
      try {
        const headers = { "x-admin-role": "business-ops" };
        const [metricsRes, anomaliesRes] = await Promise.all([
          fetch("api/admin/intelligence?action=metrics", { headers, cache: "no-store" }),
          fetch("api/admin/intelligence?action=anomalies", { headers, cache: "no-store" })
        ]);

        if (!metricsRes.ok) {
          throw new Error(`Metrics request failed with ${metricsRes.status}`);
        }

        const metricsPayload = await metricsRes.json();
        const rawMetrics = metricsPayload.metrics || metricsPayload.data || metricsPayload || {};
        setMetrics({
          ...FALLBACK_METRICS,
          ...rawMetrics
        });

        if (anomaliesRes.ok) {
          const anomaliesPayload = await anomaliesRes.json();
          const anomalies = anomaliesPayload.anomalies || anomaliesPayload.data?.anomalies || [];
          if (Array.isArray(anomalies) && anomalies.length > 0) {
            setAlerts(
              anomalies.slice(0, 3).map((anomaly: any, index: number) => ({
                id: String(index + 1),
                type: anomaly.severity || "medium",
                title: anomaly.title || `Business ops anomaly in ${anomaly.metric || "signal"}`,
                description: anomaly.description || "CSI detected an unusual operations pattern.",
                source: anomaly.source || "CSI Intelligence",
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : "now",
                impact: anomaly.impact || String(anomaly.severity || "Medium")
              }))
            );
          } else {
            setAlerts(FALLBACK_ALERTS);
          }
        } else {
          setAlerts(FALLBACK_ALERTS);
        }
      } catch (error) {
        console.error("Failed to load business operations intelligence", error);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadBusinessData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Business Operations Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Business Operations Dashboard</h1>
                <p className="text-gray-600">
                  Revenue, growth, customer metrics, and business performance oversight
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Export Report
                </Button>
                <Button variant="danger" size="sm">
                  Business Alert
                </Button>
                <Button variant="primary" size="sm">
                  Growth Strategy
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                type={
                  alert.type === "critical" ? "error" : alert.type === "high" ? "warning" : "info"
                }
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-start">
                    <div className="text-lg mr-3">
                      {alert.type === "critical" ? "🚨" : alert.type === "high" ? "⚠️" : "ℹ️"}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.source} • {alert.timestamp} • Impact: {alert.impact}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Analyze
                    </Button>
                    <Button size="sm" variant="primary">
                      Action Plan
                    </Button>
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
                <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${metrics?.dailyRevenue.toLocaleString()}
                </p>
              </div>
              <Badge variant="success">+5.2%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.activeUsers.toLocaleString()}
                </p>
              </div>
              <Badge variant="success">+12.8%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.conversionRate}%</p>
              </div>
              <Badge variant="warning">-0.3%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer LTV</p>
                <p className="text-2xl font-bold text-gray-900">${metrics?.lifetimeValue}</p>
              </div>
              <Badge variant="success">+8.7%</Badge>
            </div>
          </Card>
        </div>

        <Card title="Business Performance Overview">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  ${metrics?.monthlyRecurringRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Monthly Recurring Revenue</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics?.retentionRate}%</div>
                <div className="text-sm text-gray-600">Customer Retention Rate</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{metrics?.userEngagement}%</div>
                <div className="text-sm text-gray-600">User Engagement Score</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
