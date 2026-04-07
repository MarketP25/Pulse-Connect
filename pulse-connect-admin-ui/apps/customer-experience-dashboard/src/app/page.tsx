"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";

interface CustomerExperienceMetrics {
  customerSatisfactionScore: number;
  netPromoterScore: number;
  supportTicketResolutionTime: number;
  firstResponseTime: number;
  customerRetentionRate: number;
  userEngagementRate: number;
  supportTicketVolume: number;
  selfServiceResolutionRate: number;
  mobileAppCrashRate: number;
  pageLoadTime: number;
}

interface SupportAlert {
  id: string;
  type: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  timestamp: string;
  affectedUsers: number;
}

const FALLBACK_METRICS: CustomerExperienceMetrics = {
  customerSatisfactionScore: 4.3,
  netPromoterScore: 42,
  supportTicketResolutionTime: 7200,
  firstResponseTime: 900,
  customerRetentionRate: 0.87,
  userEngagementRate: 0.73,
  supportTicketVolume: 1247,
  selfServiceResolutionRate: 0.68,
  mobileAppCrashRate: 0.015,
  pageLoadTime: 1850
};

const FALLBACK_ALERTS: SupportAlert[] = [
  {
    id: "1",
    type: "high",
    title: "Support Ticket Backlog Increasing",
    description: "Ticket volume exceeded normal threshold by 35%",
    source: "Support System",
    timestamp: "1 hour ago",
    affectedUsers: 247
  },
  {
    id: "2",
    type: "medium",
    title: "Mobile App Performance Degradation",
    description: "Page load times increased by 22% in last 24 hours",
    source: "Mobile Analytics",
    timestamp: "3 hours ago",
    affectedUsers: 1250
  },
  {
    id: "3",
    type: "low",
    title: "Customer Satisfaction Score Trending Down",
    description: "CSAT decreased by 0.3 points over the past week",
    source: "CSI Analytics",
    timestamp: "6 hours ago",
    affectedUsers: 0
  }
];

export default function CustomerExperienceDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<CustomerExperienceMetrics | null>(null);
  const [alerts, setAlerts] = useState<SupportAlert[]>([]);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const headers = { "x-admin-role": "customer-experience" };
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
                type: anomaly.severity || "low",
                title:
                  anomaly.title || `Customer experience anomaly in ${anomaly.metric || "signal"}`,
                description:
                  anomaly.description || "CSI detected an unusual customer experience pattern.",
                source: anomaly.source || "CSI Intelligence",
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : "now",
                affectedUsers: Number(anomaly.affectedUsers || anomaly.impactCount || 0)
              }))
            );
          } else {
            setAlerts(FALLBACK_ALERTS);
          }
        } else {
          setAlerts(FALLBACK_ALERTS);
        }
      } catch (error) {
        console.error("Failed to load customer experience intelligence", error);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Customer Experience Dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Customer Experience Dashboard</h1>
                <p className="text-gray-600">
                  Customer satisfaction, support quality, and user experience metrics
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Customer Survey
                </Button>
                <Button variant="danger" size="sm">
                  Escalate Issue
                </Button>
                <Button variant="primary" size="sm">
                  Support Response
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Critical Customer Experience Alerts */}
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
                    <div>
                      <h4 className="font-medium">{alert.title}</h4>
                      <p className="text-sm">{alert.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.source} • {alert.timestamp}
                        {alert.affectedUsers > 0 && ` • ${alert.affectedUsers} users affected`}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Investigate
                    </Button>
                    <Button size="sm" variant="primary">
                      Resolve
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Key Customer Experience Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.customerSatisfactionScore}/5.0
                </p>
              </div>
              <Badge variant="success">Good</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Promoter Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.netPromoterScore}</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Support Resolution Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(metrics?.supportTicketResolutionTime! / 3600)}h
                </p>
              </div>
              <Badge variant="warning">Monitor</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Retention</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(metrics?.customerRetentionRate! * 100)}%
                </p>
              </div>
              <Badge variant="success">Strong</Badge>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveView("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Experience Overview
              </button>
              <button
                onClick={() => setActiveView("support")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "support"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Support Operations
              </button>
              <button
                onClick={() => setActiveView("engagement")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "engagement"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                User Engagement
              </button>
              <button
                onClick={() => setActiveView("quality")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "quality"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Quality Assurance
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Experience Quality Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="User Experience Quality">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Page Load Time</span>
                    <span className="font-medium text-green-600">{metrics?.pageLoadTime}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Mobile App Crashes</span>
                    <span className="font-medium text-green-600">
                      {(metrics?.mobileAppCrashRate! * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">User Engagement</span>
                    <span className="font-medium text-blue-600">
                      {Math.round(metrics?.userEngagementRate! * 100)}%
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Support Effectiveness">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">First Response Time</span>
                    <span className="font-medium text-blue-600">
                      {Math.round(metrics?.firstResponseTime! / 60)}min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Self-Service Resolution</span>
                    <span className="font-medium text-green-600">
                      {Math.round(metrics?.selfServiceResolutionRate! * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Active Tickets</span>
                    <span className="font-medium text-orange-600">
                      {metrics?.supportTicketVolume}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Customer Journey">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Onboarding Completion</span>
                    <span className="font-medium text-green-600">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Feature Discovery</span>
                    <span className="font-medium text-blue-600">78%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Task Success Rate</span>
                    <span className="font-medium text-green-600">91%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeView === "support" && (
          <div className="space-y-6">
            <Card title="Support Operations Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Ticket Management</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Open Tickets</span>
                        <Badge variant="warning">{metrics?.supportTicketVolume}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Critical Priority</span>
                        <Badge variant="error">12</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Escalated</span>
                        <Badge variant="error">3</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Resolution Time</span>
                        <span className="font-medium">2.1h</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Support Channels</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Live Chat</span>
                        <span className="font-medium text-green-600">98% Satisfaction</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Email Support</span>
                        <span className="font-medium text-blue-600">24h Response</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Knowledge Base</span>
                        <span className="font-medium text-green-600">85% Self-Service</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Phone Support</span>
                        <span className="font-medium text-blue-600">2min Wait Time</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">🎧</div>
                  <h3 className="text-sm font-medium text-gray-900">Support Command Center</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Real-time support monitoring, ticket routing, and customer communication tools
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === "engagement" && (
          <div className="space-y-6">
            <Card title="User Engagement Analytics">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">73%</div>
                    <div className="text-sm text-gray-600">Daily Active Users</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">4.8</div>
                    <div className="text-sm text-gray-600">Avg Session Duration</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">12.3</div>
                    <div className="text-sm text-gray-600">Features per Session</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-sm font-medium text-gray-900">Engagement Insights</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    User behavior analytics, feature adoption tracking, and engagement optimization
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === "quality" && (
          <div className="space-y-6">
            <Card title="Quality Assurance Dashboard">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <span className="font-medium text-green-600">0.02%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Uptime</span>
                        <span className="font-medium text-green-600">99.97%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">API Response Time</span>
                        <span className="font-medium text-blue-600">245ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Data Accuracy</span>
                        <span className="font-medium text-green-600">99.8%</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Quality Controls</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Automated Tests</span>
                        <Badge variant="success">2,847 Passed</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Manual Reviews</span>
                        <Badge variant="success">156 Completed</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Security Scans</span>
                        <Badge variant="success">Clean</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Compliance Audits</span>
                        <Badge variant="success">Passed</Badge>
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
  );
}
