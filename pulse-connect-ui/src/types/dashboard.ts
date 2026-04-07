export type DashboardTier = "basic" | "premium" | "enterprise";

export type DashboardRole =
  | "admin"
  | "individual"
  | "business"
  | "organisation"
  | "investor"
  | "partner";

export type SupportedDashboardLanguage = string;
export type ComplianceProfile = "gdpr" | "ccpa" | "global-default";

export type KycStatus = "not_required" | "pending" | "verified" | "rejected";

export type ApplicationStatus = "pending_review" | "approved" | "rejected" | "under_review";

export type DashboardModuleKey =
  | "core"
  | "profile"
  | "ecommerce"
  | "subscription"
  | "insights"
  | "places"
  | "matchmaking"
  | "communication"
  | "marketing"
  | "security"
  | "reporting"
  | "operations";

export interface ConsentSettings {
  privacyPolicy: boolean;
  termsOfService: boolean;
  dataProcessing: boolean;
  marketing: boolean;
  locationServices: boolean;
  profiling: boolean;
}

export interface DashboardUser {
  id: string;
  displayName: string;
  emailMasked: string;
  emailHash: string;
  role: DashboardRole;
  tier: DashboardTier;
  preferredLanguage: SupportedDashboardLanguage;
  country: string;
  city: string;
  complianceProfile: ComplianceProfile;
  kycStatus: KycStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  referralCode: string;
  referredByCode?: string;
  referralCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardFeatureAccess {
  module: DashboardModuleKey;
  enabled: boolean;
  reason?: string;
}

export interface ProductOffering {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  requiredTier: DashboardTier;
  category: "service" | "subscription" | "addon";
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  amountUsd: number;
  purchasedAt: string;
  status: "completed" | "refunded";
}

export interface InvoiceRecord {
  id: string;
  purchaseId: string;
  amountUsd: number;
  issuedAt: string;
  dueAt: string;
  status: "paid" | "pending";
}

export interface DashboardRecommendation {
  id: string;
  source: "pulsco-ai" | "csi";
  title: string;
  detail: string;
  priority: "low" | "medium" | "high";
  requiresApproval: boolean;
  approvalRole: "none" | "superadmin" | "founder";
  status: "suggested" | "approved" | "rejected";
}

export interface DashboardAlert {
  id: string;
  type: "fraud" | "system" | "optimization";
  severity: "info" | "warning" | "critical";
  message: string;
  createdAt: string;
}

export interface NearbyPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  distanceKm: number;
  score: number;
}

export interface MatchmakingSuggestion {
  id: string;
  label: string;
  type: "service" | "partner";
  compatibility: number;
  reason: string;
}

export interface CommunicationMessage {
  id: string;
  from: string;
  subject: string;
  preview: string;
  createdAt: string;
  unread: boolean;
}

export interface DashboardNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  level: "info" | "warning";
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface MarketingCampaignMetric {
  id: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spendUsd: number;
}

export interface DashboardInteractionEvent {
  userId: string;
  eventType: string;
  module: DashboardModuleKey;
  metadata?: Record<string, string | number | boolean>;
  timestamp: number;
}

export interface DashboardOpsMetric {
  module: string;
  totalRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastUpdatedAt: string;
}

export interface DashboardBackupSnapshot {
  id: string;
  createdAt: string;
  reason: string;
  signature: string;
  userCount: number;
  purchaseCount: number;
}

export interface DashboardAiStatus {
  available: boolean;
  provider: string;
  mode: "live" | "fallback";
}

export interface ReportingTrendPoint {
  label: string;
  value: number;
}

export interface ReportingRevenueSummary {
  grossUsd: number;
  netUsd: number;
  orders: number;
  currency: string;
  period: string;
}

export interface FraudAnomaly {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  detectedAt: string;
}

export interface DashboardReportingModule {
  source: string;
  refreshedAt: string;
  revenueSummary: ReportingRevenueSummary;
  revenueTrends: ReportingTrendPoint[];
  performanceLatencyMs: number;
  anomalies: FraudAnomaly[];
}

export interface DashboardFraudModule {
  source: string;
  refreshedAt: string;
  riskScore: number;
  anomalies: FraudAnomaly[];
}

export interface DashboardIdentitySession {
  id: string;
  device: string;
  ipMasked: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface DashboardIdentityHistoryEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
}

export interface DashboardIdentityModule {
  source: string;
  refreshedAt: string;
  accountStatus: "pending_verification" | "active" | "suspended" | "deactivated";
  twoFactorEnabled: boolean;
  onboardingRequiredActions: string[];
  sessions: DashboardIdentitySession[];
  history: DashboardIdentityHistoryEntry[];
}

export interface DashboardBillingSubscription {
  tier: DashboardTier;
  status: "active" | "pending" | "cancelled" | "expired";
  region: string;
  renewalAt?: string;
}

export interface DashboardLedgerEntry {
  id: string;
  type: string;
  amountUsd: number;
  balanceUsd: number;
  createdAt: string;
}

export interface DashboardBillingPolicyVersion {
  version: string;
  status: "active" | "deprecated";
  createdAt: string;
}

export interface DashboardBillingModule {
  source: string;
  refreshedAt: string;
  subscription: DashboardBillingSubscription;
  ledgerEntries: DashboardLedgerEntry[];
  policyVersions: DashboardBillingPolicyVersion[];
}

export interface DashboardManagedPlace {
  id: string;
  name: string;
  category: string;
  status: "draft" | "published" | "archived";
  updatedAt: string;
}

export interface DashboardPlaceBooking {
  id: string;
  placeId: string;
  status: "pending" | "confirmed" | "cancelled";
  startAt: string;
  endAt: string;
  totalUsd: number;
}

export interface DashboardPlacesOperationsModule {
  source: string;
  refreshedAt: string;
  places: DashboardManagedPlace[];
  bookings: DashboardPlaceBooking[];
  transactions: DashboardLedgerEntry[];
}

export interface DashboardBrief {
  id: string;
  title: string;
  status: "open" | "in_review" | "closed";
  createdAt: string;
}

export interface DashboardProposal {
  id: string;
  briefId: string;
  status: "submitted" | "accepted" | "rejected";
  amountUsd: number;
  createdAt: string;
}

export interface DashboardContract {
  id: string;
  proposalId: string;
  status: "draft" | "active" | "completed" | "cancelled";
  createdAt: string;
}

export interface DashboardMatchmakingOperationsModule {
  source: string;
  refreshedAt: string;
  briefs: DashboardBrief[];
  proposals: DashboardProposal[];
  contracts: DashboardContract[];
}

export interface DashboardLocalizationProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "unhealthy";
  latencyMs: number;
  errorRate: number;
}

export interface DashboardLanguageCoverage {
  language: string;
  regions: string[];
  quality: "high" | "medium" | "low";
}

export interface DashboardLocalizationAdvancedModule {
  source: string;
  refreshedAt: string;
  providerHealth: DashboardLocalizationProviderHealth[];
  languageCoverage: DashboardLanguageCoverage[];
  sampleTranslation?: {
    sourceText: string;
    targetLanguage: string;
    translatedText: string;
    provider: string;
  };
}

export interface DashboardProximityRule {
  id: string;
  name: string;
  value: string;
}

export interface DashboardProximityMetric {
  name: string;
  value: number;
}

export interface DashboardProximityAdvancedModule {
  source: string;
  refreshedAt: string;
  health: {
    status: "healthy" | "degraded" | "unhealthy";
    latencyMs: number;
  };
  rules: DashboardProximityRule[];
  metrics: DashboardProximityMetric[];
}

export interface DashboardGovernanceArbitration {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface DashboardGovernanceModule {
  source: string;
  refreshedAt: string;
  csiApprovals: DashboardRecommendation[];
  policyVersions: string[];
  firewallRuleCount: number;
  arbitrations: DashboardGovernanceArbitration[];
}

export interface DashboardSnapshot {
  generatedAt: string;
  user: DashboardUser;
  access: DashboardFeatureAccess[];
  consents: ConsentSettings;
  products: ProductOffering[];
  purchases: PurchaseRecord[];
  invoices: InvoiceRecord[];
  recommendations: DashboardRecommendation[];
  alerts: DashboardAlert[];
  nearbyPlaces: NearbyPlace[];
  matchmaking: MatchmakingSuggestion[];
  inbox: CommunicationMessage[];
  notifications: DashboardNotification[];
  announcements: Announcement[];
  campaigns: MarketingCampaignMetric[];
  opsMetrics: DashboardOpsMetric[];
  backups: DashboardBackupSnapshot[];
  aiStatus?: DashboardAiStatus;
  localizationProvider?: string;
  dictionary?: Record<string, string>;
  reporting?: DashboardReportingModule;
  fraud?: DashboardFraudModule;
  identity?: DashboardIdentityModule;
  billing?: DashboardBillingModule;
  placesOperations?: DashboardPlacesOperationsModule;
  matchmakingOperations?: DashboardMatchmakingOperationsModule;
  localizationAdvanced?: DashboardLocalizationAdvancedModule;
  proximityAdvanced?: DashboardProximityAdvancedModule;
  governance?: DashboardGovernanceModule;
}

export interface DashboardProfileUpdate {
  displayName?: string;
  role?: DashboardRole;
  preferredLanguage?: SupportedDashboardLanguage;
  country?: string;
  city?: string;
}

export interface DashboardOnboardingUpdate {
  role?: DashboardRole;
  preferredLanguage?: SupportedDashboardLanguage;
  referralCode?: string;
}

export interface DashboardTierUpdate {
  tier: DashboardTier;
}

export interface DashboardSecurityUpdate {
  consents?: Partial<ConsentSettings>;
}
