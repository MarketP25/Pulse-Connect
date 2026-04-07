"use client";

import { useEffect, useState } from "react";
import { Card, Button, Badge, Alert, LoadingSpinner } from "@pulsco/admin-ui-core";

interface LegalFinanceMetrics {
  totalRevenue: number;
  netProfitMargin: number;
  complianceScore: number;
  legalCases: number;
  operatingExpenses: number;
  cashFlow: number;
  taxLiability: number;
  accountsReceivable: number;
  accountsPayable: number;
  activeContracts: number;
  auditStatus: string;
}

interface LegalFinanceAlert {
  id: string;
  type: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  source: string;
  timestamp: string;
  impact: string;
}

const FALLBACK_METRICS: LegalFinanceMetrics = {
  totalRevenue: 45200000,
  netProfitMargin: 18.5,
  complianceScore: 96.2,
  legalCases: 4,
  operatingExpenses: 32100000,
  cashFlow: 7300000,
  taxLiability: 1260000,
  accountsReceivable: 5400000,
  accountsPayable: 2900000,
  activeContracts: 184,
  auditStatus: "In Progress"
};

const FALLBACK_ALERTS: LegalFinanceAlert[] = [
  {
    id: "1",
    type: "high",
    title: "Q4 Tax Filing Deadline Approaching",
    description: "Corporate tax return due in 7 days - requires CFO approval",
    source: "Tax Compliance",
    timestamp: "2 hours ago",
    impact: "High"
  }
];

export default function LegalFinanceDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<LegalFinanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<LegalFinanceAlert[]>([]);
  const [activeView, setActiveView] = useState("overview");

  useEffect(() => {
    const loadLegalFinanceData = async () => {
      try {
        const headers = { "x-admin-role": "legal-finance" };
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
                title: anomaly.title || `Financial anomaly in ${anomaly.metric || "signal"}`,
                description: anomaly.description || "CSI detected an unusual legal/finance signal.",
                source: anomaly.source || "CSI Intelligence",
                timestamp: anomaly.timestamp ? new Date(anomaly.timestamp).toLocaleString() : "now",
                impact:
                  Number(anomaly.financialImpact || anomaly.impactAmount || 0) > 100000
                    ? "High"
                    : Number(anomaly.financialImpact || anomaly.impactAmount || 0) > 50000
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
        console.error("Failed to load legal-finance intelligence", error);
        setMetrics(FALLBACK_METRICS);
        setAlerts(FALLBACK_ALERTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadLegalFinanceData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading Legal & Finance Dashboard...</p>
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
                <h1 className="text-3xl font-bold text-gray-900">Legal & Finance Dashboard</h1>
                <p className="text-gray-600">
                  Financial performance, legal compliance, and regulatory oversight
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="secondary" size="sm">
                  Financial Report
                </Button>
                <Button variant="danger" size="sm">
                  Legal Alert
                </Button>
                <Button variant="primary" size="sm">
                  Compliance Audit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Legal & Finance Alerts */}
        {alerts.length > 0 && (
          <div className="mb-8">
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                type={
                  alert.type === "critical"
                    ? "error"
                    : alert.type === "high"
                      ? "warning"
                      : "default"
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
                        {alert.source} • {alert.timestamp} • Impact: {alert.impact}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary">
                      Review
                    </Button>
                    <Button size="sm" variant="primary">
                      Action
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Key Financial & Legal Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${metrics?.totalRevenue.toLocaleString()}
                </p>
              </div>
              <Badge variant="success">+12.3%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit Margin</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.netProfitMargin}%</p>
              </div>
              <Badge variant="success">+2.1%</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Score</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.complianceScore}%</p>
              </div>
              <Badge variant="success">Excellent</Badge>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Legal Cases</p>
                <p className="text-2xl font-bold text-gray-900">{metrics?.legalCases}</p>
              </div>
              <Badge variant="warning">Monitor</Badge>
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
                Financial Overview
              </button>
              <button
                onClick={() => setActiveView("compliance")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "compliance"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Legal Compliance
              </button>
              <button
                onClick={() => setActiveView("contracts")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "contracts"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Contracts & Agreements
              </button>
              <button
                onClick={() => setActiveView("audit")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === "audit"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Audit & Tax
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active view */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Financial Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="Revenue & Expenses">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Operating Expenses</span>
                    <span className="font-medium text-red-600">
                      ${metrics?.operatingExpenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cash Flow</span>
                    <span className="font-medium text-green-600">
                      ${metrics?.cashFlow.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Tax Liability</span>
                    <span className="font-medium text-orange-600">
                      ${metrics?.taxLiability.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>

              <Card title="Accounts Management">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Accounts Receivable</span>
                    <span className="font-medium text-blue-600">
                      ${metrics?.accountsReceivable.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Accounts Payable</span>
                    <span className="font-medium text-red-600">
                      ${metrics?.accountsPayable.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Working Capital</span>
                    <span className="font-medium text-green-600">$1.4M</span>
                  </div>
                </div>
              </Card>

              <Card title="Financial KPIs">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">ROI</span>
                    <span className="font-medium text-green-600">24.7%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">EBITDA Margin</span>
                    <span className="font-medium text-blue-600">31.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Debt-to-Equity</span>
                    <span className="font-medium text-green-600">0.3</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {activeView === "compliance" && (
          <div className="space-y-6">
            <Card title="Compliance Command Center">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Regulatory Compliance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">GDPR Compliance</span>
                        <Badge variant="success">Compliant</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">SOX Compliance</span>
                        <Badge variant="success">Compliant</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Industry Regulations</span>
                        <Badge variant="warning">Under Review</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Data Privacy Audits</span>
                        <span className="font-medium">2 Scheduled</span>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Legal Risk Assessment</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Active Lawsuits</span>
                        <Badge variant="warning">{metrics?.legalCases}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Settlement Reserve</span>
                        <span className="font-medium">$500K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Insurance Coverage</span>
                        <Badge variant="success">Adequate</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Legal Spend</span>
                        <span className="font-medium">$2.1M YTD</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">⚖️</div>
                  <h3 className="text-sm font-medium text-gray-900">Legal Compliance Hub</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Regulatory monitoring, compliance reporting, and legal risk management
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === "contracts" && (
          <div className="space-y-6">
            <Card title="Contract Management System">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics?.activeContracts}
                    </div>
                    <div className="text-sm text-gray-600">Active Contracts</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">23</div>
                    <div className="text-sm text-gray-600">Expiring This Month</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">98.5%</div>
                    <div className="text-sm text-gray-600">Contract Compliance</div>
                  </div>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-sm font-medium text-gray-900">Contract Lifecycle</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Contract creation, negotiation, execution, and renewal management
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeView === "audit" && (
          <div className="space-y-6">
            <Card title="Audit & Tax Management">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Audit Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Current Audit</span>
                        <Badge variant="info">{metrics?.auditStatus}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Audit Firm</span>
                        <span className="font-medium">Deloitte</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completion Date</span>
                        <span className="font-medium">Q2 2024</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Findings to Date</span>
                        <Badge variant="success">None</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Tax Management</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Tax Liability</span>
                        <span className="font-medium text-orange-600">
                          ${metrics?.taxLiability.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tax Credits Available</span>
                        <span className="font-medium text-green-600">$180K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Filing Status</span>
                        <Badge variant="warning">In Progress</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Tax Rate</span>
                        <span className="font-medium">21%</span>
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
