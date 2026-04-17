import { randomUUID } from "crypto";
import {
  Announcement,
  CommunicationMessage,
  ConsentSettings,
  DashboardAlert,
  DashboardBillingModule,
  DashboardBillingPolicyVersion,
  DashboardBillingSubscription,
  DashboardBackupSnapshot,
  DashboardBrief,
  DashboardContract,
  DashboardFraudModule,
  DashboardGovernanceArbitration,
  DashboardGovernanceModule,
  DashboardIdentityHistoryEntry,
  DashboardIdentityModule,
  DashboardIdentitySession,
  DashboardInteractionEvent,
  DashboardLanguageCoverage,
  DashboardLedgerEntry,
  DashboardLocalizationAdvancedModule,
  DashboardLocalizationProviderHealth,
  DashboardManagedPlace,
  DashboardMatchmakingOperationsModule,
  DashboardNotification,
  DashboardOpsMetric,
  DashboardPlaceBooking,
  DashboardPlacesOperationsModule,
  DashboardProposal,
  DashboardProximityAdvancedModule,
  DashboardProximityMetric,
  DashboardProximityRule,
  DashboardRecommendation,
  DashboardReportingModule,
  DashboardRole,
  DashboardTier,
  DashboardUser,
  FraudAnomaly,
  InvoiceRecord,
  KycStatus,
  MarketingCampaignMetric,
  MatchmakingSuggestion,
  NearbyPlace,
  ProductOffering,
  PurchaseRecord,
  SupportedDashboardLanguage
} from "@/types/dashboard";
import { maskEmail, hashSensitive, signPayload } from "./pc365";
import { defaultConsents, resolveComplianceProfile } from "./compliance";
import { geocodeWithProximity } from "./proximity-client";

interface InternalUser {
  id: string;
  email: string;
  displayName: string;
  role: DashboardRole;
  tier: DashboardTier;
  preferredLanguage: SupportedDashboardLanguage;
  country: string;
  city: string;
  kycStatus: KycStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  referralCode: string;
  referredByCode?: string;
  referralCredits: number;
  consents: ConsentSettings;
  createdAt: string;
  updatedAt: string;
}

interface DashboardLogEntry {
  id: string;
  module: string;
  action: string;
  status: "success" | "failure";
  userId?: string;
  latencyMs: number;
  at: string;
  detail?: string;
}

type MetricAccumulator = {
  module: string;
  totalRequests: number;
  failedRequests: number;
  totalLatencyMs: number;
  lastLatencyMs: number;
  lastUpdatedAt: string;
};

const TIER_PRIORITY: Record<DashboardTier, number> = {
  basic: 1,
  premium: 2,
  enterprise: 3
};

const PRODUCTS: ProductOffering[] = [
  {
    id: "prd-core-automation",
    name: "Automation Starter",
    description: "Core dashboard optimization and automation templates.",
    priceUsd: 29,
    requiredTier: "basic",
    category: "addon"
  },
  {
    id: "prd-smart-commerce",
    name: "Smart Commerce Suite",
    description: "Advanced ecommerce tooling with intelligent fraud hints.",
    priceUsd: 99,
    requiredTier: "premium",
    category: "service"
  },
  {
    id: "prd-planetary-reporting",
    name: "Planetary Reporting",
    description: "Enterprise reporting pipeline with global KPI slicing.",
    priceUsd: 349,
    requiredTier: "enterprise",
    category: "subscription"
  }
];

const PLACES: Array<Omit<NearbyPlace, "distanceKm">> = [
  {
    id: "pl-nyc-hub",
    name: "PULSCO NYC Hub",
    latitude: 40.7128,
    longitude: -74.006,
    category: "workspace",
    score: 96
  },
  {
    id: "pl-nairobi-partner",
    name: "Nairobi Growth Partner",
    latitude: -1.2921,
    longitude: 36.8219,
    category: "partner",
    score: 91
  },
  {
    id: "pl-london-fulfillment",
    name: "London Fulfillment Point",
    latitude: 51.5072,
    longitude: -0.1276,
    category: "fulfillment",
    score: 89
  }
];

const MATCHMAKING: MatchmakingSuggestion[] = [
  {
    id: "mm-design-labs",
    label: "Design Labs Collective",
    type: "partner",
    compatibility: 92,
    reason: "High overlap with your commerce and communication goals."
  },
  {
    id: "mm-local-growth",
    label: "Local Growth Accelerator",
    type: "service",
    compatibility: 88,
    reason: "Strong regional coverage and language-aligned support."
  }
];

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-upgrade-2026-03",
    title: "New Adaptive Insights Engine",
    body: "CSI advisory insights now include fraud and optimization overlays.",
    createdAt: new Date().toISOString()
  }
];

const CAMPAIGNS: MarketingCampaignMetric[] = [
  {
    id: "cmp-retarget-01",
    campaignName: "Cross-Sell Retargeting",
    impressions: 124_500,
    clicks: 8_945,
    conversions: 1_032,
    spendUsd: 2_180
  },
  {
    id: "cmp-localized-02",
    campaignName: "Localized Landing Funnel",
    impressions: 86_310,
    clicks: 6_778,
    conversions: 913,
    spendUsd: 1_540
  }
];

function tierAtLeast(current: DashboardTier, required: DashboardTier): boolean {
  return TIER_PRIORITY[current] >= TIER_PRIORITY[required];
}

function buildReferralCode(seed: string): string {
  return `${seed
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 6)
    .toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function distanceKm(latA: number, lonA: number, latB: number, lonB: number): number {
  const R = 6371;
  const dLat = ((latB - latA) * Math.PI) / 180;
  const dLon = ((lonB - lonA) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((latA * Math.PI) / 180) *
      Math.cos((latB * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

function inferTierFromUserId(userId: string): DashboardTier {
  if (userId.toLowerCase().includes("enterprise")) {
    return "enterprise";
  }
  if (userId.toLowerCase().includes("premium")) {
    return "premium";
  }
  return "basic";
}

export class DashboardStore {
  private readonly users = new Map<string, InternalUser>();
  private readonly purchases = new Map<string, PurchaseRecord[]>();
  private readonly invoices = new Map<string, InvoiceRecord[]>();
  private readonly inbox = new Map<string, CommunicationMessage[]>();
  private readonly notifications = new Map<string, DashboardNotification[]>();
  private readonly recommendations = new Map<string, DashboardRecommendation[]>();
  private readonly interactions = new Map<string, DashboardInteractionEvent[]>();
  private readonly logs: DashboardLogEntry[] = [];
  private readonly metricAccumulators = new Map<string, MetricAccumulator>();
  private readonly backups: DashboardBackupSnapshot[] = [];
  private readonly geocodeCache = new Map<string, { latitude: number; longitude: number }>();
  private readonly managedPlaces = new Map<string, DashboardManagedPlace[]>();
  private readonly placeBookings = new Map<string, DashboardPlaceBooking[]>();
  private readonly briefs = new Map<string, DashboardBrief[]>();
  private readonly proposals = new Map<string, DashboardProposal[]>();
  private readonly contracts = new Map<string, DashboardContract[]>();
  private readonly identitySessions = new Map<string, DashboardIdentitySession[]>();
  private readonly twoFactorEnabledUsers = new Set<string>();
  private readonly subscriptionStatus = new Map<string, DashboardBillingSubscription["status"]>();
  private readonly arbitrations = new Map<string, DashboardGovernanceArbitration[]>();
  private readonly proximityRules: DashboardProximityRule[] = [
    { id: "prx-rule-01", name: "location-consent-required", value: "true" },
    { id: "prx-rule-02", name: "max-radius-km", value: "150" },
    { id: "prx-rule-03", name: "reason-code", value: "CSI_GATEWAY_ACCESS" }
  ];

  constructor() {
    this.seed();
  }

  private seed() {
    const now = new Date().toISOString();
    const seedUsers: InternalUser[] = [
      {
        id: "demo-basic",
        email: "basic.user@pulsco.global",
        displayName: "Basic User",
        role: "individual",
        tier: "basic",
        preferredLanguage: "en",
        country: "US",
        city: "Austin",
        kycStatus: "not_required",
        emailVerified: true,
        phoneVerified: false,
        referralCode: "BASIC-100",
        referralCredits: 1,
        consents: defaultConsents(),
        createdAt: now,
        updatedAt: now
      },
      {
        id: "demo-premium",
        email: "premium.user@pulsco.global",
        displayName: "Premium User",
        role: "business",
        tier: "premium",
        preferredLanguage: "en",
        country: "US",
        city: "Seattle",
        kycStatus: "verified",
        emailVerified: true,
        phoneVerified: true,
        referralCode: "PREM-200",
        referralCredits: 4,
        consents: {
          ...defaultConsents(),
          marketing: true,
          profiling: true
        },
        createdAt: now,
        updatedAt: now
      },
      {
        id: "demo-enterprise",
        email: "enterprise.user@pulsco.global",
        displayName: "Enterprise User",
        role: "organisation",
        tier: "enterprise",
        preferredLanguage: "en",
        country: "US",
        city: "New York",
        kycStatus: "verified",
        emailVerified: true,
        phoneVerified: true,
        referralCode: "ENT-900",
        referralCredits: 9,
        consents: {
          ...defaultConsents(),
          marketing: true,
          profiling: true
        },
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const user of seedUsers) {
      this.users.set(user.id, user);
      this.purchases.set(user.id, []);
      this.invoices.set(user.id, []);
      this.managedPlaces.set(user.id, []);
      this.placeBookings.set(user.id, []);
      this.briefs.set(user.id, []);
      this.proposals.set(user.id, []);
      this.contracts.set(user.id, []);
      this.subscriptionStatus.set(user.id, "active");
      this.arbitrations.set(user.id, []);
      this.inbox.set(user.id, [
        {
          id: randomUUID(),
          from: "support@pulsco.global",
          subject: "Welcome to Pulsco Global Ltd",
          preview: "Your universal dashboard is ready.",
          createdAt: now,
          unread: false
        }
      ]);
      this.notifications.set(user.id, [
        {
          id: randomUUID(),
          title: "Security posture stable",
          body: "No critical anomalies detected in the last 24 hours.",
          level: "info",
          createdAt: now
        }
      ]);
      this.recommendations.set(user.id, [
        {
          id: randomUUID(),
          source: "pulsco-ai",
          title: "Improve conversion with localized offers",
          detail: "Run EN + ES campaign variants to increase click-through rates.",
          priority: "medium",
          requiresApproval: false,
          approvalRole: "none",
          status: "suggested"
        }
      ]);
      this.identitySessions.set(user.id, [
        {
          id: randomUUID(),
          device: "Chrome on Windows",
          ipMasked: "192.168.xxx.xxx",
          createdAt: now,
          lastSeenAt: now
        }
      ]);
      if (user.phoneVerified) {
        this.twoFactorEnabledUsers.add(user.id);
      }
    }
  }

  getOrCreateUser(userId: string): InternalUser {
    const existing = this.users.get(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const tier = inferTierFromUserId(userId);

    const user: InternalUser = {
      id: userId,
      email: `${userId}@pulsco.local`,
      displayName: userId,
      role: "individual",
      tier,
      preferredLanguage: "en",
      country: "US",
      city: "San Francisco",
      kycStatus: tier === "basic" ? "not_required" : "pending",
      emailVerified: true,
      phoneVerified: false,
      referralCode: buildReferralCode(userId),
      referralCredits: 0,
      consents: defaultConsents(),
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, user);
    this.purchases.set(userId, []);
    this.invoices.set(userId, []);
    this.managedPlaces.set(userId, []);
    this.placeBookings.set(userId, []);
    this.briefs.set(userId, []);
    this.proposals.set(userId, []);
    this.contracts.set(userId, []);
    this.subscriptionStatus.set(userId, "active");
    this.arbitrations.set(userId, []);
    this.inbox.set(userId, []);
    this.notifications.set(userId, []);
    this.recommendations.set(userId, []);
    this.identitySessions.set(userId, [
      {
        id: randomUUID(),
        device: "Chrome on Web",
        ipMasked: "203.0.xxx.xxx",
        createdAt: now,
        lastSeenAt: now
      }
    ]);
    return user;
  }

  toPublicUser(user: InternalUser): DashboardUser {
    return {
      id: user.id,
      displayName: user.displayName,
      emailMasked: maskEmail(user.email),
      emailHash: hashSensitive(user.email),
      role: user.role,
      tier: user.tier,
      preferredLanguage: user.preferredLanguage,
      country: user.country,
      city: user.city,
      complianceProfile: resolveComplianceProfile(user.country),
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      referralCode: user.referralCode,
      referredByCode: user.referredByCode,
      referralCredits: user.referralCredits,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  getConsents(userId: string): ConsentSettings {
    return this.getOrCreateUser(userId).consents;
  }

  updateProfile(userId: string, input: Partial<InternalUser>): DashboardUser {
    const current = this.getOrCreateUser(userId);
    const updated: InternalUser = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString()
    };
    this.users.set(userId, updated);
    return this.toPublicUser(updated);
  }

  updateOnboarding(
    userId: string,
    input: {
      role?: DashboardRole;
      preferredLanguage?: SupportedDashboardLanguage;
      referralCode?: string;
    }
  ): DashboardUser {
    const current = this.getOrCreateUser(userId);

    if (input.referralCode && !current.referredByCode) {
      const referrer = [...this.users.values()].find(
        (entry) => entry.referralCode === input.referralCode
      );
      if (referrer && referrer.id !== current.id) {
        current.referredByCode = input.referralCode;
        referrer.referralCredits += 1;
        referrer.updatedAt = new Date().toISOString();
        this.users.set(referrer.id, referrer);
      }
    }

    return this.updateProfile(userId, {
      role: input.role || current.role,
      preferredLanguage: input.preferredLanguage || current.preferredLanguage
    });
  }

  updateTier(userId: string, tier: DashboardTier): DashboardUser {
    const user = this.getOrCreateUser(userId);
    const kycStatus: KycStatus =
      tier === "basic" ? "not_required" : user.kycStatus === "verified" ? "verified" : "pending";
    this.subscriptionStatus.set(userId, "active");
    return this.updateProfile(userId, { tier, kycStatus });
  }

  completeKyc(userId: string, approved = true): DashboardUser {
    return this.updateProfile(userId, {
      kycStatus: approved ? "verified" : "rejected"
    });
  }

  updateConsents(userId: string, partial: Partial<ConsentSettings>): ConsentSettings {
    const user = this.getOrCreateUser(userId);
    const next = {
      ...user.consents,
      ...partial
    };
    user.consents = next;
    user.updatedAt = new Date().toISOString();
    this.users.set(userId, user);
    return next;
  }

  syncProductCatalogWithBilling(planPrices: Partial<Record<DashboardTier, number>>): void {
    for (const product of PRODUCTS) {
      const priceFromBilling = planPrices[product.requiredTier];
      if (
        typeof priceFromBilling === "number" &&
        Number.isFinite(priceFromBilling) &&
        priceFromBilling > 0
      ) {
        product.priceUsd = Number(priceFromBilling.toFixed(2));
      }
    }
  }

  getProductById(productId: string): ProductOffering | null {
    const product = PRODUCTS.find((item) => item.id === productId);
    return product || null;
  }

  validateProductPurchase(userId: string, productId: string): ProductOffering {
    const user = this.getOrCreateUser(userId);
    const product = PRODUCTS.find((item) => item.id === productId);
    if (!product) {
      throw new Error("product_not_found");
    }
    if (!tierAtLeast(user.tier, product.requiredTier)) {
      throw new Error("tier_upgrade_required");
    }
    if ((user.tier === "premium" || user.tier === "enterprise") && user.kycStatus !== "verified") {
      throw new Error("paid_tier_kyc_required");
    }
    return product;
  }

  listProducts(userId: string): ProductOffering[] {
    const user = this.getOrCreateUser(userId);
    return PRODUCTS.filter((product) => tierAtLeast(user.tier, product.requiredTier));
  }

  listPurchases(userId: string): PurchaseRecord[] {
    return this.purchases.get(userId) || [];
  }

  listInvoices(userId: string): InvoiceRecord[] {
    return this.invoices.get(userId) || [];
  }

  purchaseProduct(
    userId: string,
    productId: string,
    options?: { amountUsd?: number }
  ): PurchaseRecord {
    const product = this.validateProductPurchase(userId, productId);

    const billedAmount =
      typeof options?.amountUsd === "number" &&
      Number.isFinite(options.amountUsd) &&
      options.amountUsd > 0
        ? Number(options.amountUsd.toFixed(2))
        : product.priceUsd;

    const purchase: PurchaseRecord = {
      id: randomUUID(),
      productId,
      productName: product.name,
      amountUsd: billedAmount,
      purchasedAt: new Date().toISOString(),
      status: "completed"
    };

    const invoice: InvoiceRecord = {
      id: randomUUID(),
      purchaseId: purchase.id,
      amountUsd: billedAmount,
      issuedAt: purchase.purchasedAt,
      dueAt: purchase.purchasedAt,
      status: "paid"
    };

    this.purchases.set(userId, [purchase, ...(this.purchases.get(userId) || [])]);
    this.invoices.set(userId, [invoice, ...(this.invoices.get(userId) || [])]);

    return purchase;
  }

  getRecommendations(userId: string): DashboardRecommendation[] {
    return this.recommendations.get(userId) || [];
  }

  upsertRecommendations(userId: string, next: DashboardRecommendation[]): void {
    this.recommendations.set(userId, next);
  }

  getAlerts(userId: string): DashboardAlert[] {
    const user = this.getOrCreateUser(userId);
    const now = new Date().toISOString();
    const alerts: DashboardAlert[] = [];

    if ((user.tier === "premium" || user.tier === "enterprise") && user.kycStatus !== "verified") {
      alerts.push({
        id: randomUUID(),
        type: "fraud",
        severity: "warning",
        message: "Paid tier operations are restricted until full KYC verification is complete.",
        createdAt: now
      });
    }

    if (!user.consents.dataProcessing) {
      alerts.push({
        id: randomUUID(),
        type: "system",
        severity: "warning",
        message:
          "Some dashboard intelligence modules are paused until data processing consent is re-enabled.",
        createdAt: now
      });
    }

    alerts.push({
      id: randomUUID(),
      type: "optimization",
      severity: "info",
      message: "CSI recommends consolidating campaigns into top-performing channels.",
      createdAt: now
    });

    return alerts;
  }

  async listNearbyPlaces(userId: string): Promise<NearbyPlace[]> {
    const user = this.getOrCreateUser(userId);
    const locationKey = `${user.city}, ${user.country}`;
    const cachedLocation = this.geocodeCache.get(locationKey);
    let current = cachedLocation;

    if (!current) {
      const geocoded = await geocodeWithProximity(locationKey);
      current = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude
      };
      this.geocodeCache.set(locationKey, current);
    }

    return PLACES.map((place) => ({
      ...place,
      distanceKm: distanceKm(current.latitude, current.longitude, place.latitude, place.longitude)
    })).sort((a, b) => a.distanceKm - b.distanceKm);
  }

  listMatchmaking(userId: string): MatchmakingSuggestion[] {
    void userId;
    return MATCHMAKING;
  }

  listInbox(userId: string): CommunicationMessage[] {
    return this.inbox.get(userId) || [];
  }

  listNotifications(userId: string): DashboardNotification[] {
    return this.notifications.get(userId) || [];
  }

  listAnnouncements(): Announcement[] {
    return ANNOUNCEMENTS;
  }

  listCampaignMetrics(userId: string): MarketingCampaignMetric[] {
    const user = this.getOrCreateUser(userId);
    if (user.tier === "basic") {
      return [];
    }
    if (!user.consents.marketing) {
      return [];
    }
    return CAMPAIGNS;
  }

  listFraudAnomalies(userId: string): FraudAnomaly[] {
    const now = new Date().toISOString();
    const alerts = this.getAlerts(userId).filter((alert) => alert.type === "fraud");
    const anomalies = alerts.map((alert) => ({
      id: alert.id,
      type: "policy_alert",
      severity:
        alert.severity === "critical"
          ? "critical"
          : alert.severity === "warning"
            ? "high"
            : "medium",
      message: alert.message,
      detectedAt: alert.createdAt
    })) as FraudAnomaly[];

    anomalies.push({
      id: randomUUID(),
      type: "behavioral_drift",
      severity: "medium",
      message: "Behavioral pattern drift detected; monitor sensitive actions.",
      detectedAt: now
    });

    return anomalies.slice(0, 8);
  }

  getReportingModule(userId: string): DashboardReportingModule {
    const purchases = this.listPurchases(userId);
    const invoices = this.listInvoices(userId);
    const grossUsd = Number(purchases.reduce((acc, item) => acc + item.amountUsd, 0).toFixed(2));
    const netUsd = Number((grossUsd * 0.93).toFixed(2));
    const orders = purchases.length;
    const now = new Date();

    const trends = Array.from({ length: 6 }, (_, index) => {
      const pointDate = new Date(now.getTime() - (5 - index) * 86_400_000);
      return {
        label: pointDate.toISOString().slice(5, 10),
        value: Number((grossUsd * (0.55 + index * 0.09)).toFixed(2))
      };
    });

    return {
      source: "dashboard-store-fallback",
      refreshedAt: now.toISOString(),
      revenueSummary: {
        grossUsd,
        netUsd,
        orders: Math.max(orders, invoices.length),
        currency: "USD",
        period: "last_30_days"
      },
      revenueTrends: trends,
      performanceLatencyMs: 142,
      anomalies: this.listFraudAnomalies(userId)
    };
  }

  getFraudModule(userId: string): DashboardFraudModule {
    const user = this.getOrCreateUser(userId);
    const riskScore = user.kycStatus === "verified" ? 18 : 47;
    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      riskScore,
      anomalies: this.listFraudAnomalies(userId)
    };
  }

  getIdentityModule(userId: string): DashboardIdentityModule {
    const user = this.getOrCreateUser(userId);
    const required: string[] = [];
    if (!user.emailVerified) {
      required.push("verify_email");
    }
    if ((user.tier === "premium" || user.tier === "enterprise") && user.kycStatus !== "verified") {
      required.push("complete_kyc");
    }
    if (!this.twoFactorEnabledUsers.has(user.id)) {
      required.push("enable_2fa");
    }

    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      accountStatus: user.emailVerified ? "active" : "pending_verification",
      twoFactorEnabled: this.twoFactorEnabledUsers.has(user.id),
      onboardingRequiredActions: required,
      sessions: this.identitySessions.get(user.id) || [],
      history: this.listIdentityHistory(user.id)
    };
  }

  enableTwoFactor(userId: string): DashboardIdentityModule {
    this.twoFactorEnabledUsers.add(userId);
    this.updateProfile(userId, { phoneVerified: true });
    return this.getIdentityModule(userId);
  }

  listBillingModule(userId: string): DashboardBillingModule {
    const user = this.getOrCreateUser(userId);
    const purchases = this.listPurchases(userId);
    const invoices = this.listInvoices(userId);
    let runningBalance = 0;
    const ledgerEntries: DashboardLedgerEntry[] = [];

    for (const purchase of [...purchases].reverse()) {
      runningBalance += purchase.amountUsd;
      ledgerEntries.push({
        id: purchase.id,
        type: "charge",
        amountUsd: purchase.amountUsd,
        balanceUsd: Number(runningBalance.toFixed(2)),
        createdAt: purchase.purchasedAt
      });
    }

    for (const invoice of invoices.slice(0, 3)) {
      ledgerEntries.unshift({
        id: invoice.id,
        type: "invoice",
        amountUsd: invoice.amountUsd,
        balanceUsd: Number(runningBalance.toFixed(2)),
        createdAt: invoice.issuedAt
      });
    }

    const policyVersions: DashboardBillingPolicyVersion[] = [
      {
        version: "2026.03.01",
        status: "active",
        createdAt: new Date().toISOString()
      },
      {
        version: "2025.12.15",
        status: "deprecated",
        createdAt: new Date(Date.now() - 7_776_000_000).toISOString()
      }
    ];

    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      subscription: {
        tier: user.tier,
        status: this.subscriptionStatus.get(user.id) || "active",
        region: user.country,
        renewalAt: new Date(Date.now() + 2_592_000_000).toISOString()
      },
      ledgerEntries: ledgerEntries.slice(0, 15),
      policyVersions
    };
  }

  cancelBillingSubscription(userId: string): DashboardBillingModule {
    this.subscriptionStatus.set(userId, "cancelled");
    return this.listBillingModule(userId);
  }

  renewBillingSubscription(userId: string): DashboardBillingModule {
    this.subscriptionStatus.set(userId, "active");
    return this.listBillingModule(userId);
  }

  listPlacesOperations(userId: string): DashboardPlacesOperationsModule {
    const places = this.managedPlaces.get(userId) || [];
    const bookings = this.placeBookings.get(userId) || [];
    const transactions: DashboardLedgerEntry[] = bookings.map((booking) => ({
      id: booking.id,
      type: booking.status === "cancelled" ? "refund" : "booking",
      amountUsd: booking.totalUsd,
      balanceUsd: booking.totalUsd,
      createdAt: booking.startAt
    }));

    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      places,
      bookings,
      transactions
    };
  }

  createManagedPlace(
    userId: string,
    input: { name: string; category: string }
  ): DashboardPlacesOperationsModule {
    const current = this.managedPlaces.get(userId) || [];
    current.unshift({
      id: randomUUID(),
      name: input.name,
      category: input.category,
      status: "published",
      updatedAt: new Date().toISOString()
    });
    this.managedPlaces.set(userId, current.slice(0, 30));
    return this.listPlacesOperations(userId);
  }

  createPlaceBooking(
    userId: string,
    input: { placeId: string; totalUsd: number; startAt: string; endAt: string }
  ): DashboardPlacesOperationsModule {
    const current = this.placeBookings.get(userId) || [];
    current.unshift({
      id: randomUUID(),
      placeId: input.placeId,
      status: "confirmed",
      startAt: input.startAt,
      endAt: input.endAt,
      totalUsd: Number(input.totalUsd.toFixed(2))
    });
    this.placeBookings.set(userId, current.slice(0, 50));
    return this.listPlacesOperations(userId);
  }

  cancelPlaceBooking(userId: string, bookingId: string): DashboardPlacesOperationsModule {
    const current = (this.placeBookings.get(userId) || []).map((booking) =>
      booking.id === bookingId ? { ...booking, status: "cancelled" as const } : booking
    );
    this.placeBookings.set(userId, current);
    return this.listPlacesOperations(userId);
  }

  listMatchmakingOperations(userId: string): DashboardMatchmakingOperationsModule {
    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      briefs: this.briefs.get(userId) || [],
      proposals: this.proposals.get(userId) || [],
      contracts: this.contracts.get(userId) || []
    };
  }

  createBrief(userId: string, title: string): DashboardMatchmakingOperationsModule {
    const current = this.briefs.get(userId) || [];
    current.unshift({
      id: randomUUID(),
      title,
      status: "open",
      createdAt: new Date().toISOString()
    });
    this.briefs.set(userId, current.slice(0, 50));
    return this.listMatchmakingOperations(userId);
  }

  submitProposal(
    userId: string,
    briefId: string,
    amountUsd: number
  ): DashboardMatchmakingOperationsModule {
    const current = this.proposals.get(userId) || [];
    current.unshift({
      id: randomUUID(),
      briefId,
      status: "submitted",
      amountUsd: Number(amountUsd.toFixed(2)),
      createdAt: new Date().toISOString()
    });
    this.proposals.set(userId, current.slice(0, 100));
    return this.listMatchmakingOperations(userId);
  }

  createContract(userId: string, proposalId: string): DashboardMatchmakingOperationsModule {
    const current = this.contracts.get(userId) || [];
    current.unshift({
      id: randomUUID(),
      proposalId,
      status: "active",
      createdAt: new Date().toISOString()
    });
    this.contracts.set(userId, current.slice(0, 100));
    return this.listMatchmakingOperations(userId);
  }

  getLocalizationAdvancedModule(userId: string): DashboardLocalizationAdvancedModule {
    const user = this.getOrCreateUser(userId);
    const providerHealth: DashboardLocalizationProviderHealth[] = [
      { provider: "localization-service", status: "healthy", latencyMs: 121, errorRate: 0.01 },
      { provider: "azure-translator", status: "healthy", latencyMs: 144, errorRate: 0.02 },
      { provider: "fallback", status: "degraded", latencyMs: 15, errorRate: 0.04 }
    ];
    const languageCoverage: DashboardLanguageCoverage[] = [
      { language: "en", regions: ["us", "eu", "asia"], quality: "high" },
      { language: "sw", regions: ["africa"], quality: "high" },
      { language: "fr", regions: ["eu", "africa"], quality: "high" },
      { language: "es", regions: ["us", "eu", "south_america"], quality: "high" }
    ];
    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      providerHealth,
      languageCoverage,
      sampleTranslation: {
        sourceText: "Welcome to Pulsco Global Ltd",
        targetLanguage: user.preferredLanguage,
        translatedText: `[${user.preferredLanguage.toUpperCase()}] Welcome to Pulsco Global Ltd`,
        provider: "fallback"
      }
    };
  }

  getProximityAdvancedModule(userId: string): DashboardProximityAdvancedModule {
    void userId;
    const metrics: DashboardProximityMetric[] = [
      { name: "geocode_requests_24h", value: 1284 },
      { name: "distance_calculations_24h", value: 3491 },
      { name: "cluster_ops_24h", value: 203 }
    ];
    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      health: {
        status: "healthy",
        latencyMs: 97
      },
      rules: this.proximityRules,
      metrics
    };
  }

  getGovernanceModule(userId: string): DashboardGovernanceModule {
    const csiApprovals = this.getRecommendations(userId).filter((item) => item.requiresApproval);
    const arbitrations = this.arbitrations.get(userId) || [];
    return {
      source: "dashboard-store-fallback",
      refreshedAt: new Date().toISOString(),
      csiApprovals,
      policyVersions: ["1.0.0", "1.1.0", "1.2.0"],
      firewallRuleCount: 14,
      arbitrations
    };
  }

  requestArbitration(userId: string): DashboardGovernanceModule {
    const list = this.arbitrations.get(userId) || [];
    list.unshift({
      id: randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString()
    });
    this.arbitrations.set(userId, list.slice(0, 30));
    return this.getGovernanceModule(userId);
  }

  updateRecommendationStatus(
    userId: string,
    recommendationId: string,
    status: DashboardRecommendation["status"]
  ): DashboardRecommendation[] {
    const list = this.getRecommendations(userId).map((item) =>
      item.id === recommendationId ? { ...item, status } : item
    );
    this.recommendations.set(userId, list);
    return list;
  }

  private listIdentityHistory(userId: string): DashboardIdentityHistoryEntry[] {
    const entries = this.logs
      .filter((log) => log.userId === userId)
      .slice(0, 20)
      .map((log) => ({
        id: log.id,
        action: `${log.module}.${log.action}`,
        actor: "dashboard-service",
        at: log.at
      }));

    if (entries.length === 0) {
      entries.push({
        id: randomUUID(),
        action: "identity.account_initialized",
        actor: "dashboard-service",
        at: new Date().toISOString()
      });
    }

    return entries;
  }

  addInteraction(event: DashboardInteractionEvent): void {
    const list = this.interactions.get(event.userId) || [];
    list.unshift(event);
    this.interactions.set(event.userId, list.slice(0, 100));
  }

  listRecentInteractions(userId: string): DashboardInteractionEvent[] {
    return this.interactions.get(userId) || [];
  }

  recordOperation(input: {
    module: string;
    action: string;
    status: "success" | "failure";
    latencyMs: number;
    userId?: string;
    detail?: string;
  }) {
    const at = new Date().toISOString();
    this.logs.unshift({
      id: randomUUID(),
      module: input.module,
      action: input.action,
      status: input.status,
      userId: input.userId,
      latencyMs: input.latencyMs,
      at,
      detail: input.detail
    });

    if (this.logs.length > 500) {
      this.logs.length = 500;
    }

    const existing = this.metricAccumulators.get(input.module) || {
      module: input.module,
      totalRequests: 0,
      failedRequests: 0,
      totalLatencyMs: 0,
      lastLatencyMs: 0,
      lastUpdatedAt: at
    };

    existing.totalRequests += 1;
    if (input.status === "failure") {
      existing.failedRequests += 1;
    }
    existing.totalLatencyMs += input.latencyMs;
    existing.lastLatencyMs = input.latencyMs;
    existing.lastUpdatedAt = at;

    this.metricAccumulators.set(input.module, existing);
  }

  createBackup(reason: string): DashboardBackupSnapshot {
    const users = [...this.users.values()].map((user) => ({
      id: user.id,
      role: user.role,
      tier: user.tier,
      kycStatus: user.kycStatus,
      updatedAt: user.updatedAt,
      consentHash: signPayload(user.consents)
    }));

    const snapshot = {
      at: new Date().toISOString(),
      reason,
      users,
      purchaseCount: [...this.purchases.values()].reduce((acc, current) => acc + current.length, 0)
    };

    const summary: DashboardBackupSnapshot = {
      id: randomUUID(),
      createdAt: snapshot.at,
      reason,
      signature: signPayload(snapshot),
      userCount: users.length,
      purchaseCount: snapshot.purchaseCount
    };

    this.backups.unshift(summary);
    if (this.backups.length > 50) {
      this.backups.length = 50;
    }

    return summary;
  }

  listOpsMetrics(): DashboardOpsMetric[] {
    return [...this.metricAccumulators.values()].map((metric) => ({
      module: metric.module,
      totalRequests: metric.totalRequests,
      failedRequests: metric.failedRequests,
      avgLatencyMs: Number((metric.totalLatencyMs / Math.max(metric.totalRequests, 1)).toFixed(2)),
      lastLatencyMs: metric.lastLatencyMs,
      lastUpdatedAt: metric.lastUpdatedAt
    }));
  }

  listBackups(): DashboardBackupSnapshot[] {
    return this.backups.slice(0, 10);
  }
}

declare global {
  var __pulscoDashboardStore: DashboardStore | undefined;
}

export function getDashboardStore(): DashboardStore {
  if (!global.__pulscoDashboardStore) {
    global.__pulscoDashboardStore = new DashboardStore();
  }

  return global.__pulscoDashboardStore;
}

