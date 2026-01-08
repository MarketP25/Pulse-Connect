import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface TranslationMetrics {
  totalTranslations: number;
  averageLatency: number;
  successRate: number;
  costPerTranslation: number;
  topLanguages: Array<{ language: string; count: number; percentage: number }>;
  latencyDistribution: Array<{ range: string; count: number }>;
  providerUsage: Array<{ provider: string; translations: number; cost: number }>;
  regionalUsage: Array<{ region: string; translations: number; revenue: number }>;
}

interface FraudAlert {
  id: string;
  type: 'suspicious_pattern' | 'rate_limit_exceeded' | 'anomalous_translation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId: number;
  timestamp: string;
  traceId: string;
}

export const TranslationDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<TranslationMetrics | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchFraudAlerts();
  }, [timeRange]);

  const fetchMetrics = async () => {
    try {
      // Mock data - in real implementation, this would call the backend API
      const mockMetrics: TranslationMetrics = {
        totalTranslations: 125430,
        averageLatency: 245, // ms
        successRate: 99.7,
        costPerTranslation: 0.023,
        topLanguages: [
          { language: 'en', count: 45230, percentage: 36.1 },
          { language: 'sw', count: 23410, percentage: 18.7 },
          { language: 'es', count: 18920, percentage: 15.1 },
          { language: 'fr', count: 15670, percentage: 12.5 },
          { language: 'zh', count: 12340, percentage: 9.8 },
          { language: 'other', count: 9860, percentage: 7.8 }
        ],
        latencyDistribution: [
          { range: '<100ms', count: 45230 },
          { range: '100-200ms', count: 34560 },
          { range: '200-500ms', count: 28940 },
          { range: '500ms-1s', count: 12340 },
          { range: '1s-2s', count: 3240 },
          { range: '>2s', count: 1120 }
        ],
        providerUsage: [
          { provider: 'google', translations: 62340, cost: 1438.20 },
          { provider: 'azure', translations: 45230, cost: 1041.29 },
          { provider: 'aws', translations: 17860, cost: 411.38 }
        ],
        regionalUsage: [
          { region: 'US', translations: 45230, revenue: 1041.29 },
          { region: 'KE', translations: 34560, revenue: 794.88 },
          { region: 'EU', translations: 28940, revenue: 665.62 },
          { region: 'Asia', translations: 16700, revenue: 383.10 }
        ]
      };
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFraudAlerts = async () => {
    try {
      // Mock fraud alerts
      const mockAlerts: FraudAlert[] = [
        {
          id: '1',
          type: 'suspicious_pattern',
          severity: 'high',
          description: 'User 12345 has 50+ translations in 5 minutes across 10+ languages',
          userId: 12345,
          timestamp: new Date().toISOString(),
          traceId: 'trace-12345'
        },
        {
          id: '2',
          type: 'rate_limit_exceeded',
          severity: 'medium',
          description: 'User 67890 exceeded 1000 translations per hour',
          userId: 67890,
          timestamp: new Date(Date.now() - 300000).toISOString(),
          traceId: 'trace-67890'
        }
      ];
      setFraudAlerts(mockAlerts);
    } catch (error) {
      console.error('Failed to fetch fraud alerts:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Translation Dashboard</h1>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="1h">Last Hour</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Translations</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.totalTranslations.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Average Latency</h3>
          <p className="text-2xl font-bold text-gray-900">{metrics?.averageLatency}ms</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
          <p className="text-2xl font-bold text-green-600">{metrics?.successRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Cost per Translation</h3>
          <p className="text-2xl font-bold text-gray-900">${metrics?.costPerTranslation}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Language Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics?.topLanguages}
                dataKey="count"
                nameKey="language"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ language, percentage }) => `${language}: ${percentage}%`}
              >
                {metrics?.topLanguages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Distribution */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Latency Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.latencyDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Usage */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.providerUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="provider" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="translations" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Regional Usage */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Usage</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.regionalUsage}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="translations" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fraud Alerts */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Active Fraud Alerts</h3>
        <div className="space-y-3">
          {fraudAlerts.map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getSeverityColor(alert.severity) }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.description}</p>
                  <p className="text-xs text-gray-500">
                    User {alert.userId} • {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                  alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  Investigate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
