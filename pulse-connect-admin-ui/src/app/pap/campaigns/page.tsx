"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Zap
} from "lucide-react";
import {
  PAPCampaign,
  CampaignStatus,
  MarketingChannel
} from "../../../../../packages/pap_v1/src/types/pap";

interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalActions: number;
  deliveredActions: number;
  totalRevenue: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export default function PAPCampaignsPage() {
  const [campaigns, setCampaigns] = useState<PAPCampaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<PAPCampaign | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, []);

  const loadCampaigns = async () => {
    try {
      // Mock data - in real implementation, this would call the PAP API
      const mockCampaigns: PAPCampaign[] = [
        {
          id: "1",
          name: "Welcome Series 2024",
          description: "Onboarding campaign for new users",
          type: "promotional",
          status: "running",
          channels: ["email", "push"],
          audience: { type: "dynamic", criteria: {} },
          content: {
            subject: "Welcome to Pulsco Global Ltd!",
            body: "Welcome message...",
            localization: { enabled: false, languages: [], fallbackLanguage: "en" }
          },
          schedule: { type: "immediate" },
          goals: { primary: { type: "engagement", target: 1000, metric: "opens" } },
          budget: { amount: 500, currency: "USD", spent: 125 },
          targeting: { enabled: true, locationBased: true },
          createdBy: "admin",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01")
        },
        {
          id: "2",
          name: "Product Launch - Q1",
          description: "Launch campaign for new proximity features",
          type: "product_launch",
          status: "scheduled",
          channels: ["email", "sms", "social_facebook"],
          audience: { type: "segment", criteria: {} },
          content: {
            subject: "New Features Available!",
            body: "Exciting updates...",
            localization: { enabled: false, languages: ["es", "fr"], fallbackLanguage: "en" }
          },
          schedule: { type: "scheduled", startDate: new Date("2024-02-01") },
          goals: { primary: { type: "conversion", target: 500, metric: "purchases" } },
          budget: { amount: 2000, currency: "USD", spent: 0 },
          targeting: { enabled: true, locationBased: true, geofencing: true },
          createdBy: "admin",
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15")
        }
      ];
      setCampaigns(mockCampaigns);
    } catch (error) {
      console.error("Failed to load campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Mock stats - in real implementation, this would call the PAP analytics API
      const mockStats: CampaignStats = {
        totalCampaigns: 24,
        activeCampaigns: 8,
        totalActions: 125000,
        deliveredActions: 118750,
        totalRevenue: 45680,
        avgOpenRate: 0.32,
        avgClickRate: 0.08
      };
      setStats(mockStats);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const variants = {
      draft: "secondary",
      scheduled: "outline",
      running: "default",
      paused: "destructive",
      completed: "default",
      cancelled: "destructive",
      failed: "destructive"
    } as const;

    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getChannelIcon = (channel: MarketingChannel) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "sms":
        return <MessageSquare className="h-4 w-4" />;
      case "push":
        return <Smartphone className="h-4 w-4" />;
      case "social_facebook":
        return <Users className="h-4 w-4" />;
      default:
        return <Zap className="h-4 w-4" />;
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesStatus = filterStatus === "all" || campaign.status === filterStatus;
    const matchesSearch =
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PAP Campaign Management</h1>
          <p className="text-muted-foreground">Manage proximity-aware marketing campaigns</p>
        </div>
        <Button>
          <Zap className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
              <p className="text-xs text-muted-foreground">{stats.activeCampaigns} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actions Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {stats.deliveredActions.toLocaleString()} delivered
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From campaign conversions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Performance</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats.avgOpenRate * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Open rate • {(stats.avgClickRate * 100).toFixed(1)}% CTR
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Management */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Manage and monitor your marketing campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <Input
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground">{campaign.description}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {campaign.channels.map((channel) => (
                        <div key={channel} className="flex items-center">
                          {getChannelIcon(channel)}
                        </div>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        ${campaign.budget.spent} / ${campaign.budget.amount}
                      </div>
                      <Progress
                        value={(campaign.budget.spent / campaign.budget.amount) * 100}
                        className="w-20 h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Open: 32%</div>
                      <div>Click: 8%</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Campaign Details Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedCampaign?.name}</DialogTitle>
            <DialogDescription>{selectedCampaign?.description}</DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="audience">Audience</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Campaign Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Status:</span>
                        {getStatusBadge(selectedCampaign.status)}
                      </div>
                      <div className="flex justify-between">
                        <span>Type:</span>
                        <span>{selectedCampaign.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <span>{selectedCampaign.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Budget:</span>
                        <span>
                          ${selectedCampaign.budget.amount} {selectedCampaign.budget.currency}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Channels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {selectedCampaign.channels.map((channel) => (
                          <Badge
                            key={channel}
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            {getChannelIcon(channel)}
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Delivery Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Sent:</span>
                        <span>10,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivered:</span>
                        <span>9,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bounced:</span>
                        <span>500</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Engagement Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Opens:</span>
                        <span>3,200 (32%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Clicks:</span>
                        <span>800 (8%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conversions:</span>
                        <span>120 (1.2%)</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>Spent:</span>
                        <span>$125.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span>$2,400.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ROI:</span>
                        <span>1,820%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="audience" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Audience Targeting</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Target Audience</h4>
                        <p className="text-sm text-muted-foreground">
                          {selectedCampaign.audience.type === "dynamic"
                            ? "Dynamic segmentation based on user behavior"
                            : selectedCampaign.audience.type === "static"
                              ? "Pre-defined user list"
                              : "Segment-based targeting"}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Geographic Targeting</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedCampaign.targeting.locationBased && (
                            <Badge variant="outline">Location-based</Badge>
                          )}
                          {selectedCampaign.targeting.geofencing && (
                            <Badge variant="outline">Geofencing</Badge>
                          )}
                          {selectedCampaign.targeting.regionalSegmentation && (
                            <Badge variant="outline">Regional</Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Estimated Reach</h4>
                        <p className="text-2xl font-bold">
                          {selectedCampaign.audience.estimatedReach?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Schedule Type</label>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedCampaign.schedule.type}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Localization</label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCampaign.content.localization.enabled ? "Enabled" : "Disabled"}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Primary Goal</label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCampaign.goals.primary.type} - Target:{" "}
                          {selectedCampaign.goals.primary.target}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Budget Control</label>
                        <p className="text-sm text-muted-foreground">
                          {selectedCampaign.budget.pacing} pacing
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
