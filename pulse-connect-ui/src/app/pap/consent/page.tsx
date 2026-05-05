"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  Eye,
  Database,
  Target
} from "lucide-react";
import {
  ConsentRecord,
  MarketingChannel,
  MarketingPurpose,
  ConsentScope
} from "../../../../../packages/pap_v1/src/types/pap";

interface ConsentPreferences {
  [key: string]: boolean;
}

export default function PAPConsentPage() {
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    email_promotional: true,
    email_transactional: true,
    sms_promotional: false,
    push_promotional: false,
    social_promotional: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserConsents();
  }, []);

  const loadUserConsents = async () => {
    try {
      // Mock data - in real implementation, this would call the PAP consent API
      const mockConsents: ConsentRecord[] = [
        {
          id: "1",
          userId: "user123",
          channel: "email",
          purpose: "promotional",
          scope: ["contact_info", "behavioral_data"],
          grantedAt: new Date("2024-01-01"),
          source: "user_opt_in",
          metadata: {}
        },
        {
          id: "2",
          userId: "user123",
          channel: "sms",
          purpose: "transactional",
          scope: ["contact_info"],
          grantedAt: new Date("2024-01-01"),
          source: "user_opt_in",
          metadata: {}
        }
      ];
      setConsents(mockConsents);
    } catch (error) {
      console.error("Failed to load consents:", error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (key: string, value: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));

    // In real implementation, this would call the PAP consent API
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Mock API delay
      // Update consent based on preference change
    } catch (error) {
      console.error("Failed to update preference:", error);
    } finally {
      setSaving(false);
    }
  };

  const revokeConsent = async (consentId: string) => {
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setConsents((prev) => prev.filter((c) => c.id !== consentId));
    } catch (error) {
      console.error("Failed to revoke consent:", error);
    }
  };

  const getChannelIcon = (channel: MarketingChannel) => {
    switch (channel) {
      case "email":
        return <Mail className="h-5 w-5" />;
      case "sms":
        return <MessageSquare className="h-5 w-5" />;
      case "push":
        return <Smartphone className="h-5 w-5" />;
      case "social_facebook":
      case "social_twitter":
      case "social_instagram":
      case "social_linkedin":
        return <Users className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getPurposeDescription = (purpose: MarketingPurpose) => {
    switch (purpose) {
      case "promotional":
        return "Product updates, special offers, and marketing communications";
      case "transactional":
        return "Order confirmations, shipping updates, and account notifications";
      case "educational":
        return "Tutorials, tips, and learning content";
      case "survey":
        return "Feedback requests and research surveys";
      case "event_invitation":
        return "Invitations to events and webinars";
      case "product_update":
        return "New feature announcements and product updates";
      default:
        return "Marketing communications";
    }
  };

  const getScopeDescription = (scope: ConsentScope) => {
    switch (scope) {
      case "contact_info":
        return "Email address, phone number";
      case "location_data":
        return "Geographic location and proximity data";
      case "behavioral_data":
        return "How you interact with our services";
      case "purchase_history":
        return "Your order and transaction history";
      case "communication_preferences":
        return "Your preferred communication channels";
      default:
        return "Personal data";
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Privacy & Marketing Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Control how we use your data and communicate with you
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your privacy is important to us. You can change these preferences at any time. All
          marketing communications comply with GDPR and other privacy regulations.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences">Communication Preferences</TabsTrigger>
          <TabsTrigger value="consents">Active Consents</TabsTrigger>
          <TabsTrigger value="data">Data Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Communications</CardTitle>
              <CardDescription>Control email marketing and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Promotional Emails</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Special offers, product updates, and marketing communications
                  </p>
                </div>
                <Switch
                  checked={preferences.email_promotional}
                  onCheckedChange={(checked) => updatePreference("email_promotional", checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span className="font-medium">Transactional Emails</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Order confirmations, shipping updates, and account notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.email_transactional}
                  onCheckedChange={(checked) => updatePreference("email_transactional", checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SMS & Push Notifications</CardTitle>
              <CardDescription>Control mobile messaging preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium">Promotional SMS</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Text message offers and updates</p>
                </div>
                <Switch
                  checked={preferences.sms_promotional}
                  onCheckedChange={(checked) => updatePreference("sms_promotional", checked)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span className="font-medium">Push Notifications</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mobile app notifications and alerts
                  </p>
                </div>
                <Switch
                  checked={preferences.push_promotional}
                  onCheckedChange={(checked) => updatePreference("push_promotional", checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Media & Third-Party</CardTitle>
              <CardDescription>Control social media and partner communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">Social Media Marketing</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Marketing content on social media platforms
                  </p>
                </div>
                <Switch
                  checked={preferences.social_promotional}
                  onCheckedChange={(checked) => updatePreference("social_promotional", checked)}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Active Consents</CardTitle>
              <CardDescription>
                Marketing consents you've granted for different purposes and channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {consents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No active consents found</p>
              ) : (
                <div className="space-y-4">
                  {consents.map((consent) => (
                    <div key={consent.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getChannelIcon(consent.channel)}
                            <span className="font-medium capitalize">
                              {consent.channel.replace("_", " ")} - {consent.purpose}
                            </span>
                            <Badge variant="outline">Active</Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {getPurposeDescription(consent.purpose)}
                          </p>

                          <div className="flex flex-wrap gap-1">
                            {consent.scope.map((scope) => (
                              <Badge key={scope} variant="secondary" className="text-xs">
                                {getScopeDescription(scope)}
                              </Badge>
                            ))}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Granted on {consent.grantedAt.toLocaleDateString()} via{" "}
                            {consent.source.replace("_", " ")}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => revokeConsent(consent.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Usage & Privacy</CardTitle>
              <CardDescription>
                How we use your data for marketing and personalization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Personalization</h4>
                      <p className="text-sm text-muted-foreground">
                        We use your preferences and behavior to personalize marketing content and
                        recommend relevant products or services.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Data Storage</h4>
                      <p className="text-sm text-muted-foreground">
                        Your consent preferences are securely stored and regularly audited for
                        compliance with privacy regulations.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Proximity Marketing</h4>
                      <p className="text-sm text-muted-foreground">
                        Location-based marketing uses proximity data to send relevant, timely offers
                        when you're near our partners.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Privacy Protection</h4>
                      <p className="text-sm text-muted-foreground">
                        All marketing activities are governed by strict privacy policies and can be
                        revoked at any time.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-2">Your Rights</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>
                    • <strong>Access:</strong> Request a copy of your data
                  </li>
                  <li>
                    • <strong>Rectification:</strong> Correct inaccurate data
                  </li>
                  <li>
                    • <strong>Erasure:</strong> Delete your data ("right to be forgotten")
                  </li>
                  <li>
                    • <strong>Portability:</strong> Export your data in a portable format
                  </li>
                  <li>
                    • <strong>Objection:</strong> Object to processing for marketing purposes
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
