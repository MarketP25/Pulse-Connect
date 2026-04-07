"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";
import { PulscoAIWidget } from "@pulsco/pulsco-ai-widget";

interface DpoMetrics {
  privacyScore: number;
  openIncidents: number;
  dsrRequests: number;
  piiRecordsCount: number;
  encryptionCoverage: number;
  retentionCompliance: number;
  avgResponseTime: number;
}

interface DpoAlert {
  id: string;
  type: "critical" | "high" | "warning" | "info" | "low";
  title: string;
  description: string;
  source?: string;
  timestamp?: string;
}

const FALLBACK_METRICS: DpoMetrics = {
  privacyScore: 82,
  openIncidents: 2,
  dsrRequests: 5,
  piiRecordsCount: 12000,
  encryptionCoverage: 92,
  retentionCompliance: 95,
  avgResponseTime: 48
};

const FALLBACK_ALERTS: DpoAlert[] = [
  {
    id: "1",
    type: "high",
    title: "Unusual DSR spike",
    description: "High volume of data subject requests detected",
    source: "DPO API",
    timestamp: "5 minutes ago"
  }
];

export default function DpoDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DpoMetrics | null>(null);
  const [alerts, setAlerts] = useState<DpoAlert[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("api/admin/metrics?role=dpo");
        if (!res.ok) throw new Error("metrics fetch failed");
        const payload = await res.json();
        const rawMetrics = payload.metrics || payload.data || payload || {};
        setMetrics({
          privacyScore: Number(
            rawMetrics.privacyScore || rawMetrics.privacy_score || FALLBACK_METRICS.privacyScore
          ),
          openIncidents: Number(
            rawMetrics.openIncidents || rawMetrics.open_incidents || FALLBACK_METRICS.openIncidents
          ),
          dsrRequests: Number(
            rawMetrics.dsrRequests || rawMetrics.dsr_requests || FALLBACK_METRICS.dsrRequests
          ),
          piiRecordsCount: Number(
            rawMetrics.piiRecordsCount ||
              rawMetrics.pii_records_count ||
              FALLBACK_METRICS.piiRecordsCount
          ),
          encryptionCoverage: Number(
            rawMetrics.encryptionCoverage ||
              rawMetrics.encryption_coverage ||
              FALLBACK_METRICS.encryptionCoverage
          ),
          retentionCompliance: Number(
            rawMetrics.retentionCompliance ||
              rawMetrics.retention_compliance ||
              FALLBACK_METRICS.retentionCompliance
          ),
          avgResponseTime: Number(
            rawMetrics.avgResponseTime ||
              rawMetrics.avg_response_time ||
              FALLBACK_METRICS.avgResponseTime
          )
        });
        setAlerts(
          Array.isArray(payload.alerts) && payload.alerts.length > 0
            ? payload.alerts
            : FALLBACK_ALERTS
        );
      } catch (err) {
        console.error("Failed to load DPO data from server API", err);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading DPO Dashboard...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Pulsco AI Widget for DPO Intelligence */}
      <PulscoAIWidget role="dpo" theme="dark" position="bottom-right" />

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">DPO Dashboard</h1>
              <p className="text-gray-600">
                Privacy posture, data subject requests, and compliance oversight
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="secondary" size="sm">
                Audit Logs
              </Button>
              <Button variant="primary" size="sm">
                Create DSR Report
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {alerts.length > 0 && (
          <div className="mb-6">
            {alerts.map((a) => (
              <Alert
                key={a.id}
                type={a.type === "critical" ? "error" : a.type === "high" ? "warning" : "info"}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h4 className="font-medium">{a.title}</h4>
                    <p className="text-sm">{a.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {a.source} • {a.timestamp}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Investigate
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
                <p className="text-sm font-medium text-gray-600">Privacy Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.privacyScore}%</p>
              </div>
              <Badge
                variant={
                  metrics && metrics.privacyScore > 90
                    ? "success"
                    : metrics && metrics.privacyScore > 75
                      ? "warning"
                      : "error"
                }
              >
                {metrics?.privacyScore && metrics.privacyScore > 90
                  ? "Excellent"
                  : metrics?.privacyScore && metrics.privacyScore > 75
                    ? "Good"
                    : "Review"}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Incidents</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.openIncidents}</p>
              </div>
              <Badge variant="warning">
                {metrics?.openIncidents && metrics.openIncidents > 0 ? "Open" : "None"}
              </Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">DSR Requests (30d)</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.dsrRequests}</p>
              </div>
              <Badge variant="default">DSR</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">PII Records</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.piiRecordsCount?.toLocaleString()}
                </p>
              </div>
              <Badge variant="warning">Sensitive</Badge>
            </div>
          </Card>
        </div>

        <Card title="Privacy Overview">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {metrics?.encryptionCoverage}%
                </div>
                <div className="text-sm text-gray-600">Encrypted Data Coverage</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {metrics?.retentionCompliance}%
                </div>
                <div className="text-sm text-gray-600">Retention Policy Compliance</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">{metrics?.avgResponseTime}h</div>
                <div className="text-sm text-gray-600">Avg. Incident Response Time</div>
              </div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
