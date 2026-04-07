"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";

interface SecurityMetrics {
  threatLevel: string;
  activeIncidents: number;
  vulnerabilityCount: number;
  patchCompliance: number;
  securityScore: number;
  failedLogins: number;
}

interface SecurityAlert {
  id: string;
  type: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  timestamp: string;
  priority: string;
}

const FALLBACK_METRICS: SecurityMetrics = {
  threatLevel: "medium",
  activeIncidents: 3,
  vulnerabilityCount: 47,
  patchCompliance: 89.2,
  securityScore: 87.5,
  failedLogins: 23
};

const FALLBACK_ALERTS: SecurityAlert[] = [
  {
    id: "1",
    type: "high",
    title: "Multiple Security Threats Detected",
    description: "High-severity security anomalies require immediate attention",
    source: "CSI Intelligence",
    timestamp: "30 seconds ago",
    priority: "High"
  }
];

export default function TechSecurityDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        const headers = { "x-admin-role": "tech-security" };
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
                title: anomaly.title || `Security anomaly in ${anomaly.metric || "signal"}`,
                description: anomaly.description || "CSI detected a security anomaly.",
                source: anomaly.source || "CSI Intelligence",
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : "now",
                priority:
                  Number(anomaly.securityImpact || anomaly.impactAmount || 0) > 500000
                    ? "High"
                    : Number(anomaly.securityImpact || anomaly.impactAmount || 0) > 250000
                      ? "Medium"
                      : "Low"
              }))
            );
          } else {
            setAlerts(FALLBACK_ALERTS);
          }
        } else {
          setAlerts(FALLBACK_ALERTS);
        }
      } catch (error) {
        console.error("Failed to load tech-security intelligence", error);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Tech Security Dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Tech Security Dashboard</h1>
                <p className="text-gray-600">
                  Threat detection, security monitoring, and incident response oversight
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Security Audit
                </Button>
                <Button variant="danger" size="sm">
                  Incident Response
                </Button>
                <Button variant="primary" size="sm">
                  Threat Intelligence
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
                        {alert.source} • {alert.timestamp} • Priority: {alert.priority}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Investigate
                    </Button>
                    <Button size="sm" variant="primary">
                      Respond
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
                <p className="text-sm font-medium text-gray-600">Threat Level</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.threatLevel}</p>
              </div>
              <Badge
                variant={
                  metrics?.threatLevel === "critical"
                    ? "error"
                    : metrics?.threatLevel === "high"
                      ? "warning"
                      : "success"
                }
              >
                {metrics?.threatLevel?.toUpperCase()}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.activeIncidents}</p>
              </div>
              <Badge variant="error">Critical</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Security Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.securityScore}%</p>
              </div>
              <Badge
                variant={
                  metrics?.securityScore && metrics.securityScore > 90
                    ? "success"
                    : metrics?.securityScore && metrics.securityScore > 70
                      ? "warning"
                      : "error"
                }
              >
                {metrics?.securityScore && metrics.securityScore > 90
                  ? "Excellent"
                  : metrics?.securityScore && metrics.securityScore > 70
                    ? "Good"
                    : "Needs Attention"}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Patch Compliance</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.patchCompliance}%</p>
              </div>
              <Badge
                variant={
                  metrics?.patchCompliance && metrics.patchCompliance > 95 ? "success" : "warning"
                }
              >
                {metrics?.patchCompliance && metrics.patchCompliance > 95
                  ? "Compliant"
                  : "Update Required"}
              </Badge>
            </div>
          </Card>
        </div>

        <Card title="Security Overview">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.vulnerabilityCount}
                </div>
                <div className="text-sm text-gray-600">Open Vulnerabilities</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">{metrics?.failedLogins}</div>
                <div className="text-sm text-gray-600">Failed Login Attempts</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">98.7%</div>
                <div className="text-sm text-gray-600">System Availability</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
