export interface PAPSubscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  entitlements: Entitlement[];
  createdAt: Date;
  activatedAt?: Date;
  cancelledAt?: Date;
  expiresAt?: Date;
}

export type SubscriptionStatus = "pending" | "active" | "suspended" | "cancelled" | "expired";

export interface Entitlement {
  type: EntitlementType;
  limit: number;
  used: number;
  resetDate?: Date;
  resetPeriod?: "daily" | "weekly" | "monthly";
}

export type EntitlementType =
  | "emails_per_month"
  | "sms_per_month"
  | "social_posts_per_month"
  | "campaigns_per_month"
  | "audiences_per_month";

export interface ConsentRecord {
  id: string;
  userId: string;
  channel: MarketingChannel;
  purpose: MarketingPurpose;
  scope: ConsentScope[];
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  source: ConsentSource;
  metadata: Record<string, any>;
}

export type MarketingChannel =
  | "email"
  | "sms"
  | "push"
  | "social_facebook"
  | "social_twitter"
  | "social_instagram"
  | "social_linkedin";

export type MarketingPurpose =
  | "promotional"
  | "transactional"
  | "educational"
  | "survey"
  | "event_invitation"
  | "product_update";

export type ConsentScope =
  | "contact_info"
  | "location_data"
  | "behavioral_data"
  | "purchase_history"
  | "communication_preferences";

export type ConsentSource =
  | "user_opt_in"
  | "user_opt_out"
  | "admin_grant"
  | "legal_requirement"
  | "system_default";

export interface PAPCampaign {
  id: string;
  name: string;
  description: string;
  type: CampaignType;
  status: CampaignStatus;
  channels: MarketingChannel[];
  audience: AudienceDefinition;
  content: CampaignContent;
  schedule: CampaignSchedule;
  goals: CampaignGoals;
  budget: CampaignBudget;
  targeting: ProximityTargeting;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type CampaignType =
  | "promotional"
  | "transactional"
  | "educational"
  | "survey"
  | "event"
  | "product_launch";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "cancelled"
  | "failed";

export interface AudienceDefinition {
  type: "static" | "dynamic" | "segment";
  criteria: AudienceCriteria;
  size?: number;
  estimatedReach?: number;
}

export interface AudienceCriteria {
  demographics?: DemographicCriteria;
  behavioral?: BehavioralCriteria;
  proximity?: ProximityCriteria;
  consent?: ConsentCriteria;
  customFilters?: Record<string, any>;
}

export interface DemographicCriteria {
  ageRange?: [number, number];
  gender?: string[];
  location?: LocationCriteria;
  language?: string[];
  interests?: string[];
}

export interface BehavioralCriteria {
  purchaseHistory?: PurchaseCriteria;
  engagement?: EngagementCriteria;
  activity?: ActivityCriteria;
}

export interface ProximityCriteria {
  location?: LocationCriteria;
  distance?: number; // in meters
  regions?: string[];
  geofence?: GeofenceCriteria;
}

export interface ConsentCriteria {
  channels: MarketingChannel[];
  purposes: MarketingPurpose[];
  scopes: ConsentScope[];
}

export interface LocationCriteria {
  countries?: string[];
  regions?: string[];
  cities?: string[];
  postalCodes?: string[];
}

export interface PurchaseCriteria {
  categories?: string[];
  priceRange?: [number, number];
  frequency?: "first_time" | "repeat" | "frequent";
  recency?: number; // days since last purchase
}

export interface EngagementCriteria {
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
  unsubscribeRate?: number;
}

export interface ActivityCriteria {
  lastActive?: number; // days since last activity
  sessionCount?: number;
  pageViews?: number;
}

export interface GeofenceCriteria {
  center: { lat: number; lng: number };
  radius: number; // in meters
  trigger: "enter" | "exit" | "dwell";
}

export interface CampaignContent {
  subject?: string;
  body: string;
  templateId?: string;
  variables: Record<string, any>;
  attachments?: ContentAttachment[];
  localization: ContentLocalization;
}

export interface ContentAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

export interface ContentLocalization {
  enabled: boolean;
  languages: string[];
  fallbackLanguage: string;
  autoTranslate: boolean;
}

export interface CampaignSchedule {
  type: "immediate" | "scheduled" | "recurring";
  startDate?: Date;
  endDate?: Date;
  timezone: string;
  recurrence?: RecurrenceRule;
  quietHours?: QuietHours;
  optimalTiming?: boolean;
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  endDate?: Date;
}

export interface QuietHours {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
  timezone: string;
}

export interface CampaignGoals {
  primary: CampaignGoal;
  secondary?: CampaignGoal[];
  kpis: CampaignKPI[];
}

export interface CampaignGoal {
  type: "awareness" | "engagement" | "conversion" | "revenue";
  target: number;
  metric: string;
}

export interface CampaignKPI {
  name: string;
  target: number;
  current: number;
  unit: string;
}

export interface CampaignBudget {
  amount: number;
  currency: string;
  spent: number;
  pacing: "even" | "accelerated" | "conservative";
  costPerAction?: number;
  maxCostPerAction?: number;
}

export interface ProximityTargeting {
  enabled: boolean;
  locationBased: boolean;
  geofencing: boolean;
  regionalSegmentation: boolean;
  optimalTiming: boolean;
  weatherAware: boolean;
  eventAware: boolean;
}

export interface PAPAction {
  id: string;
  campaignId?: string;
  type: ActionType;
  channel: MarketingChannel;
  recipient: ActionRecipient;
  content: ActionContent;
  status: ActionStatus;
  priority: ActionPriority;
  scheduledFor?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export type ActionType = "email_send" | "sms_send" | "push_send" | "social_post" | "webhook_call";

export interface ActionRecipient {
  userId: string;
  contactInfo: ContactInfo;
  preferences: UserPreferences;
  location?: { lat: number; lng: number };
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  pushToken?: string;
  socialHandles?: Record<string, string>;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  quietHours: QuietHours;
  channelPreferences: Record<MarketingChannel, boolean>;
}

export interface ActionContent {
  subject?: string;
  body: string;
  templateId?: string;
  variables: Record<string, any>;
  attachments?: ContentAttachment[];
  tracking: TrackingSettings;
}

export interface TrackingSettings {
  enabled: boolean;
  pixels?: string[];
  links?: string[];
  events?: string[];
}

export type ActionStatus =
  | "queued"
  | "scheduled"
  | "sending"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "converted"
  | "failed"
  | "cancelled";

export type ActionPriority = "low" | "normal" | "high" | "urgent";

export interface PAPAnalytics {
  campaignId?: string;
  period: AnalyticsPeriod;
  metrics: PAPMetrics;
  performance: PerformanceData;
  audience: AudienceAnalytics;
  channelBreakdown: ChannelMetrics[];
  geographic: GeographicMetrics;
  trends: TrendData[];
  insights: PAPInsight[];
}

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  granularity: "hour" | "day" | "week" | "month";
}

export interface PAPMetrics {
  totalActions: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  failed: number;
  bounced: number;
  unsubscribed: number;
  complained: number;
  revenue: number;
  cost: number;
  roi: number;
}

export interface PerformanceData {
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  complaintRate: number;
  deliveryRate: number;
  costPerAction: number;
  costPerAcquisition: number;
}

export interface AudienceAnalytics {
  totalRecipients: number;
  uniqueRecipients: number;
  newRecipients: number;
  repeatRecipients: number;
  segmentBreakdown: SegmentMetrics[];
}

export interface SegmentMetrics {
  segment: string;
  recipients: number;
  performance: PerformanceData;
}

export interface ChannelMetrics {
  channel: MarketingChannel;
  actions: number;
  performance: PerformanceData;
  cost: number;
}

export interface GeographicMetrics {
  countries: CountryMetrics[];
  regions: RegionMetrics[];
  cities: CityMetrics[];
}

export interface CountryMetrics {
  country: string;
  recipients: number;
  performance: PerformanceData;
}

export interface RegionMetrics {
  region: string;
  recipients: number;
  performance: PerformanceData;
}

export interface CityMetrics {
  city: string;
  recipients: number;
  performance: PerformanceData;
}

export interface TrendData {
  date: string;
  metric: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface PAPInsight {
  type: InsightType;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
  data: any;
}

export type InsightType =
  | "optimal_timing"
  | "audience_segmentation"
  | "content_performance"
  | "channel_effectiveness"
  | "geographic_opportunities"
  | "budget_optimization"
  | "engagement_patterns";

// API Interfaces
export interface CreateCampaignRequest {
  name: string;
  description: string;
  type: CampaignType;
  channels: MarketingChannel[];
  audience: AudienceDefinition;
  content: CampaignContent;
  schedule: CampaignSchedule;
  goals: CampaignGoals;
  budget: CampaignBudget;
  targeting: ProximityTargeting;
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  id: string;
  status?: CampaignStatus;
}

export interface SendActionRequest {
  campaignId?: string;
  channel: MarketingChannel;
  recipients: string[];
  content: ActionContent;
  schedule?: Date;
  priority?: ActionPriority;
}

export interface ConsentRequest {
  userId: string;
  channel: MarketingChannel;
  purpose: MarketingPurpose;
  scope: ConsentScope[];
  expiresAt?: Date;
  source: ConsentSource;
}

export interface SubscriptionRequest {
  userId: string;
  planId: string;
  entitlements: Entitlement[];
}

// Error Types
export class PAPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = "PAPError";
  }
}

export class ConsentError extends PAPError {
  constructor(message: string, details?: any) {
    super(message, "CONSENT_ERROR", 403, details);
  }
}

export class EntitlementError extends PAPError {
  constructor(message: string, details?: any) {
    super(message, "ENTITLEMENT_ERROR", 402, details);
  }
}

export class BudgetError extends PAPError {
  constructor(message: string, details?: any) {
    super(message, "BUDGET_ERROR", 402, details);
  }
}

export class ValidationError extends PAPError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", 400, details);
  }
}
