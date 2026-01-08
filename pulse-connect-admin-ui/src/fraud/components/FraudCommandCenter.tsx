import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Shield,
  Users,
  DollarSign,
  Clock,
  MapPin,
  Activity,
  TrendingUp
} from "lucide-react";

interface FraudAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  entity_type: string;
  entity_id: string;
  risk_score: number;
  region_code: string;
  created_at: string;
  triggered_rules: string[];
}

interface FraudStats {
  total_events: number;
  critical_alerts: number;
  blocked_actions: number;
  avg_response_time: number;
  regions: { [key: string]: number };
  top_rules: Array<{ rule: string; count: number }>;
}

export function FraudCommandCenter() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  useEffect(() => {
    loadFraudData();
    const interval = setInterval(loadFraudData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const loadFraudData = async () => {
    try {
      const [alertsResponse, statsResponse] = await Promise.all([
        fetch(`/api/fraud/alerts?timeRange=${selectedTimeRange}`),
        fetch(`/api/fraud/stats?timeRange=${selectedTimeRange}`)
      ]);

      const alertsData = await alertsResponse.json();
      const statsData = await statsResponse.json();

      setAlerts(alertsData.alerts);
      setStats(statsData.stats);
    } catch (error) {
      console.error("Failed to load fraud data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "info":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <Shield className="h-4 w-4" />;
      case "info":
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fraud Command Center</h1>
          <p className="text-gray-600">Real-time fraud detection and response</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={selectedTimeRange === "1h" ? "default" : "outline"}
            onClick={() => setSelectedTimeRange("1h")}
          >
            1H
          </Button>
          <Button
            variant={selectedTimeRange === "24h" ? "default" : "outline"}
            onClick={() => setSelectedTimeRange("24h")}
          >
            24H
          </Button>
          <Button
            variant={selectedTimeRange === "7d" ? "default" : "outline"}
            onClick={() => setSelectedTimeRange("7d")}
          >
            7D
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
                  <p className="text-2xl font-bold">{stats.critical_alerts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked Actions</p>
                  <p className="text-2xl font-bold">{stats.blocked_actions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Response</p>
                  <p className="text-2xl font-bold">{stats.avg_response_time.toFixed(1)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold">{stats.total_events}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Live Alerts</TabsTrigger>
          <TabsTrigger value="regions">Regional View</TabsTrigger>
          <TabsTrigger value="rules">Rule Performance</TabsTrigger>
          <TabsTrigger value="cases">Active Cases</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Fraud Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.slice(0, 20).map((alert) => (
                  <Alert
                    key={alert.id}
                    className={`border-l-4 ${getSeverityColor(alert.severity)}`}
                  >
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(alert.severity)}
                      <AlertDescription className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{alert.title}</h4>
                            <p className="text-sm text-gray-600">{alert.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{alert.entity_type}</Badge>
                              <Badge variant="outline">{alert.region_code}</Badge>
                              <span className="text-sm text-gray-500">
                                Risk: {alert.risk_score}/100
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {new Date(alert.created_at).toLocaleTimeString()}
                            </p>
                            <Button size="sm" variant="outline" className="mt-2">
                              Investigate
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats?.regions &&
              Object.entries(stats.regions).map(([region, count]) => (
                <Card key={region}>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <MapPin className="h-8 w-8 text-blue-500" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{region}</p>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-gray-500">fraud events</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Triggered Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.top_rules?.slice(0, 10).map((rule, index) => (
                  <div key={rule.rule} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="font-medium">{rule.rule}</span>
                    </div>
                    <Badge variant="secondary">{rule.count} triggers</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Investigation Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active cases at the moment</p>
                <p className="text-sm">Critical alerts will automatically create cases</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
