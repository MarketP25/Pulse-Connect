"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface CommercialMetrics {
  marketPenetration: number;
  userAcquisition: number;
  conversionRate: number;
  customerLifetimeValue: number;
  churnRate: number;
  regionalGrowth: { region: string; growth: number }[];
  channelPerformance: { channel: string; conversions: number }[];
  campaignROI: { campaign: string; roi: number }[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const FALLBACK_METRICS: CommercialMetrics = {
  marketPenetration: 12.5,
  userAcquisition: 2847,
  conversionRate: 3.2,
  customerLifetimeValue: 1250,
  churnRate: 2.1,
  regionalGrowth: [
    { region: "North America", growth: 15.2 },
    { region: "Europe", growth: 8.7 },
    { region: "Asia Pacific", growth: 22.1 },
    { region: "Latin America", growth: 12.8 }
  ],
  channelPerformance: [
    { channel: "Organic Search", conversions: 1250 },
    { channel: "Paid Ads", conversions: 890 },
    { channel: "Social Media", conversions: 567 },
    { channel: "Email", conversions: 340 }
  ],
  campaignROI: [
    { campaign: "Q4 Launch", roi: 3.2 },
    { campaign: "Holiday Promo", roi: 2.8 },
    { campaign: "Partnership Drive", roi: 4.1 },
    { campaign: "Retention Campaign", roi: 1.9 }
  ]
};

const FALLBACK_ALERTS = [
  {
    id: "1",
    type: "warning",
    title: "Low Conversion Rate",
    description: "Conversion rate below target threshold",
    severity: "medium"
  }
];

export default function CommercialDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<CommercialMetrics | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const headers = { "x-admin-role": "commercial-outreach" };
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
          ...rawMetrics,
          regionalGrowth: Array.isArray(rawMetrics.regionalGrowth)
            ? rawMetrics.regionalGrowth
            : FALLBACK_METRICS.regionalGrowth,
          channelPerformance: Array.isArray(rawMetrics.channelPerformance)
            ? rawMetrics.channelPerformance
            : FALLBACK_METRICS.channelPerformance,
          campaignROI: Array.isArray(rawMetrics.campaignROI)
            ? rawMetrics.campaignROI
            : FALLBACK_METRICS.campaignROI
        });

        if (anomaliesRes.ok) {
          const anomaliesPayload = await anomaliesRes.json();
          const anomalies = anomaliesPayload.anomalies || anomaliesPayload.data?.anomalies || [];
          if (Array.isArray(anomalies) && anomalies.length > 0) {
            setAlerts(
              anomalies.slice(0, 3).map((anomaly: any, index: number) => ({
                id: String(index + 1),
                type:
                  anomaly.severity === "critical"
                    ? "error"
                    : anomaly.severity === "high"
                      ? "warning"
                      : "warning",
                title: anomaly.title || `Commercial anomaly in ${anomaly.metric || "metric"}`,
                description: anomaly.description || "CSI reported an unexpected commercial signal.",
                severity: anomaly.severity || "medium"
              }))
            );
          } else {
            setAlerts(FALLBACK_ALERTS);
          }
        } else {
          setAlerts(FALLBACK_ALERTS);
        }
      } catch (error) {
        console.error("Failed to load commercial intelligence", error);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Commercial Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Commercial Dashboard</h1>
                <p className="text-gray-600">Market growth, acquisition, and outreach metrics</p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Export Report
                </Button>
                <Button variant="primary" size="sm">
                  New Campaign
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts Panel */}
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.map((alert) => (
              <Alert key={alert.id} type={alert.type === "warning" ? "warning" : "error"}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm">{alert.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Acknowledge
                    </Button>
                    <Button size="sm" variant="primary">
                      Escalate
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Market Penetration</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.marketPenetration}%</p>
              </div>
              <Badge variant="success">+2.1%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">User Acquisition</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.userAcquisition.toLocaleString()}
                </p>
              </div>
              <Badge variant="success">+15.3%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.conversionRate}%</p>
              </div>
              <Badge variant="warning">-0.5%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer LTV</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${metrics?.customerLifetimeValue}
                </p>
              </div>
              <Badge variant="success">+8.2%</Badge>
            </div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Regional Growth Chart */}
          <Card title="Regional Growth">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics?.regionalGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="region" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="growth" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Channel Performance Chart */}
          <Card title="Channel Performance">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics?.channelPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, percent }) => `${channel} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="conversions"
                >
                  {metrics?.channelPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Campaign ROI Table */}
        <Card title="Campaign Performance">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics?.campaignROI.map((campaign, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {campaign.campaign}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.roi}x
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          campaign.roi > 3 ? "success" : campaign.roi > 2 ? "warning" : "error"
                        }
                      >
                        {campaign.roi > 3
                          ? "Excellent"
                          : campaign.roi > 2
                            ? "Good"
                            : "Needs Attention"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button size="sm" variant="secondary">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
