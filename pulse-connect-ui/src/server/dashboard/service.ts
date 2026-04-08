import {
  ApplicationStatus,
  DashboardInteractionEvent,
  DashboardModuleKey,
  DashboardOnboardingUpdate,
  DashboardProfileUpdate,
  DashboardSecurityUpdate,
  DashboardSnapshot,
  DashboardTier,
  DashboardTierUpdate,
  DashboardUser
} from "@/types/dashboard";
import { randomUUID } from "crypto";
import { BASE_DASHBOARD_DICTIONARY } from "@/lib/dashboard/i18n";
import { moduleEnabled, resolveModuleAccess } from "./access";
import { canUseLocationFeatures, canUseMarketing } from "./compliance";
import { assertEmergencyActionAllowed, EmergencyProtocolBlockedError } from "./emergency-guard";
import {
  fetchCsiLanguageCoverage,
  fetchCsiRecommendations,
  forwardDashboardInteraction,
  type CsiLanguageCoverage
} from "./csi-gateway";
import { translateDashboardDictionary } from "./localization-client";
import {
  chargeBillingActivity,
  fetchBillingSubscriptionPlans,
  fetchBillingServiceData,
  fetchFraudServiceData,
  fetchGovernanceServiceData,
  fetchIdentityServiceData,
  fetchLocalizationHealthData,
  fetchMatchmakingServiceData,
  fetchPlacesServiceData,
  fetchProximityServiceData,
  fetchReportingServiceData,
  performBillingServiceAction,
  performPlacesServiceAction
} from "./platform-clients";
import { askPulscoAi, getPulscoAiStatus } from "./pulsco-ai-client";
import { getDashboardStore } from "./store";

export class DashboardServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

type OperationContext = {
  module: string;
  action: string;
  userId?: string;
  backupReason?: string;
};

type DashboardSnapshotOptions = {
  preferredLanguage?: string;
};

type PartnerInvestorApplicationType = "partner" | "investor";

type PartnerInvestorApplication = {
  id: string;
  userId: string;
  type: PartnerInvestorApplicationType;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedByRole: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  payload: Record<string, unknown>;
};

const partnerInvestorApplications = new Map<string, PartnerInvestorApplication>();

type LanguageCoverageItem = {
  language: string;
  regions: string[];
  quality: "high" | "medium" | "low";
};

function mergeLanguageCoverageEntries(
  primary: LanguageCoverageItem[] = [],
  secondary: CsiLanguageCoverage[] = []
): LanguageCoverageItem[] {
  const map = new Map<string, LanguageCoverageItem>();
  const qualityRank: Record<LanguageCoverageItem["quality"], number> = {
    low: 1,
    medium: 2,
    high: 3
  };

  const candidates = [...primary, ...secondary];
  for (const entry of candidates) {
    const language = String(entry.language || "")
      .trim()
      .toLowerCase();
    if (!language) {
      continue;
    }

    const existing = map.get(language);
    const regions = Array.from(
      new Set(
        [...(existing?.regions || []), ...(entry.regions || [])]
          .map((item) => String(item).trim())
          .filter(Boolean)
      )
    );
    const nextQuality =
      existing && qualityRank[existing.quality] >= qualityRank[entry.quality]
        ? existing.quality
        : entry.quality;

    map.set(language, {
      language,
      regions,
      quality: nextQuality
    });
  }

  return Array.from(map.values()).sort((a, b) => a.language.localeCompare(b.language));
}

async function runOperation<T>(ctx: OperationContext, execute: () => Promise<T> | T): Promise<T> {
  const store = getDashboardStore();
  const start = Date.now();

  try {
    const value = await execute();
    if (ctx.backupReason) {
      store.createBackup(ctx.backupReason);
    }
    store.recordOperation({
      module: ctx.module,
      action: ctx.action,
      userId: ctx.userId,
      status: "success",
      latencyMs: Date.now() - start
    });
    return value;
  } catch (error) {
    store.recordOperation({
      module: ctx.module,
      action: ctx.action,
      userId: ctx.userId,
      status: "failure",
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : "unknown_error"
    });
    throw error;
  }
}

function assertAccess(
  access: ReturnType<typeof resolveModuleAccess>,
  module: DashboardModuleKey
): void {
  if (!moduleEnabled(access, module)) {
    const reason = access.find((entry) => entry.module === module)?.reason || "Module not allowed";
    throw new DashboardServiceError("module_access_denied", 403, reason);
  }
}

async function syncDashboardCatalogWithBilling(): Promise<void> {
  const store = getDashboardStore();
  const plans = await fetchBillingSubscriptionPlans();
  const planPrices = plans.reduce(
    (acc, plan) => {
      acc[plan.tier] = plan.priceUsd;
      return acc;
    },
    {} as Partial<Record<DashboardTier, number>>
  );
  store.syncProductCatalogWithBilling(planPrices);
}

export async function getDashboardSnapshot(
  userId: string,
  options?: DashboardSnapshotOptions
): Promise<DashboardSnapshot> {
  return runOperation({ module: "dashboard", action: "bootstrap", userId }, async () => {
    const store = getDashboardStore();
    await syncDashboardCatalogWithBilling();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const requestedLanguage = options?.preferredLanguage?.trim().toLowerCase();
    const snapshotUser = requestedLanguage
      ? { ...user, preferredLanguage: requestedLanguage }
      : user;
    const access = resolveModuleAccess(user);

    const csiRecommendations = await fetchCsiRecommendations(user);
    const existingRecommendations = store.getRecommendations(user.id);
    const recommendationMap = new Map<string, (typeof existingRecommendations)[number]>();

    for (const recommendation of [...existingRecommendations, ...csiRecommendations]) {
      recommendationMap.set(recommendation.id, recommendation);
    }
    store.upsertRecommendations(user.id, [...recommendationMap.values()]);

    const consents = store.getConsents(user.id);
    const localization = await translateDashboardDictionary(
      BASE_DASHBOARD_DICTIONARY,
      snapshotUser.preferredLanguage,
      "en"
    );
    const aiStatus = getPulscoAiStatus();
    const [
      reportingFromService,
      fraudFromService,
      identityFromService,
      billingFromService,
      placesOpsFromService,
      matchmakingOpsFromService,
      governanceFromService,
      proximityFromService,
      localizationFromService,
      csiLanguageCoverage
    ] = await Promise.all([
      moduleEnabled(access, "reporting")
        ? fetchReportingServiceData(user.id)
        : Promise.resolve(null),
      moduleEnabled(access, "reporting") ? fetchFraudServiceData(user.id) : Promise.resolve(null),
      moduleEnabled(access, "security") ? fetchIdentityServiceData(user.id) : Promise.resolve(null),
      moduleEnabled(access, "subscription")
        ? fetchBillingServiceData(user.id)
        : Promise.resolve(null),
      moduleEnabled(access, "places") ? fetchPlacesServiceData(user.id) : Promise.resolve(null),
      moduleEnabled(access, "matchmaking")
        ? fetchMatchmakingServiceData(user.id)
        : Promise.resolve(null),
      moduleEnabled(access, "operations")
        ? fetchGovernanceServiceData(user.id)
        : Promise.resolve(null),
      moduleEnabled(access, "places") ? fetchProximityServiceData() : Promise.resolve(null),
      fetchLocalizationHealthData(),
      fetchCsiLanguageCoverage(snapshotUser)
    ]);

    const reporting = moduleEnabled(access, "reporting")
      ? {
          ...store.getReportingModule(user.id),
          ...(reportingFromService || {})
        }
      : undefined;
    const fraud = moduleEnabled(access, "reporting")
      ? {
          ...store.getFraudModule(user.id),
          ...(fraudFromService || {})
        }
      : undefined;
    const identity = moduleEnabled(access, "security")
      ? {
          ...store.getIdentityModule(user.id),
          ...(identityFromService || {})
        }
      : undefined;
    const billing = moduleEnabled(access, "subscription")
      ? {
          ...store.listBillingModule(user.id),
          ...(billingFromService || {})
        }
      : undefined;
    const placesOperations = moduleEnabled(access, "places")
      ? {
          ...store.listPlacesOperations(user.id),
          ...(placesOpsFromService || {})
        }
      : undefined;
    const matchmakingOperations = moduleEnabled(access, "matchmaking")
      ? {
          ...store.listMatchmakingOperations(user.id),
          ...(matchmakingOpsFromService || {})
        }
      : undefined;
    const governance = moduleEnabled(access, "operations")
      ? {
          ...store.getGovernanceModule(user.id),
          ...(governanceFromService || {})
        }
      : undefined;
    const proximityAdvanced = moduleEnabled(access, "places")
      ? {
          ...store.getProximityAdvancedModule(user.id),
          ...(proximityFromService || {})
        }
      : undefined;
    const localizationAdvanced = {
      ...store.getLocalizationAdvancedModule(user.id),
      ...(localizationFromService
        ? {
            providerHealth: localizationFromService.providerHealth || [],
            languageCoverage: mergeLanguageCoverageEntries(
              localizationFromService.languageCoverage || [],
              csiLanguageCoverage || []
            )
          }
        : { languageCoverage: mergeLanguageCoverageEntries([], csiLanguageCoverage || []) })
    };

    return {
      generatedAt: new Date().toISOString(),
      user: snapshotUser,
      access,
      consents,
      products: moduleEnabled(access, "ecommerce") ? store.listProducts(user.id) : [],
      purchases: moduleEnabled(access, "ecommerce") ? store.listPurchases(user.id) : [],
      invoices: moduleEnabled(access, "ecommerce") ? store.listInvoices(user.id) : [],
      recommendations: store.getRecommendations(user.id),
      alerts: store.getAlerts(user.id),
      nearbyPlaces:
        moduleEnabled(access, "places") && canUseLocationFeatures(consents)
          ? await store.listNearbyPlaces(user.id)
          : [],
      matchmaking: moduleEnabled(access, "matchmaking") ? store.listMatchmaking(user.id) : [],
      inbox: moduleEnabled(access, "communication") ? store.listInbox(user.id) : [],
      notifications: moduleEnabled(access, "communication") ? store.listNotifications(user.id) : [],
      announcements: store.listAnnouncements(),
      campaigns:
        moduleEnabled(access, "marketing") && canUseMarketing(consents)
          ? store.listCampaignMetrics(user.id)
          : [],
      opsMetrics: store.listOpsMetrics(),
      backups: store.listBackups(),
      aiStatus,
      localizationProvider: localization.provider,
      dictionary: localization.dictionary,
      reporting,
      fraud,
      identity,
      billing,
      placesOperations,
      matchmakingOperations,
      localizationAdvanced,
      proximityAdvanced,
      governance
    };
  });
}

export async function updateOnboarding(userId: string, input: DashboardOnboardingUpdate) {
  return runOperation(
    { module: "onboarding", action: "update", userId, backupReason: "onboarding_update" },
    async () => {
      const store = getDashboardStore();
      const updatedUser = store.updateOnboarding(userId, {
        role: input.role,
        preferredLanguage: input.preferredLanguage,
        referralCode: input.referralCode
      });

      return {
        user: updatedUser,
        access: resolveModuleAccess(updatedUser)
      };
    }
  );
}

export async function updateProfile(userId: string, input: DashboardProfileUpdate) {
  return runOperation(
    { module: "profile", action: "update", userId, backupReason: "profile_update" },
    async () => {
      const store = getDashboardStore();
      const updatedUser = store.updateProfile(userId, {
        displayName: input.displayName,
        role: input.role,
        preferredLanguage: input.preferredLanguage,
        country: input.country,
        city: input.city
      });

      return {
        user: updatedUser,
        access: resolveModuleAccess(updatedUser)
      };
    }
  );
}

export async function updateSubscriptionTier(userId: string, input: DashboardTierUpdate) {
  return runOperation(
    {
      module: "subscription",
      action: "tier_update",
      userId,
      backupReason: "subscription_tier_update"
    },
    async () => {
      const store = getDashboardStore();
      const updatedUser = store.updateTier(userId, input.tier);
      return {
        user: updatedUser,
        access: resolveModuleAccess(updatedUser)
      };
    }
  );
}

export async function completeKyc(userId: string, approved: boolean) {
  return runOperation(
    { module: "subscription", action: "kyc_complete", userId, backupReason: "kyc_completion" },
    async () => {
      const store = getDashboardStore();
      const updatedUser = store.completeKyc(userId, approved);
      return {
        user: updatedUser,
        access: resolveModuleAccess(updatedUser)
      };
    }
  );
}

export async function getEcommerceModule(userId: string) {
  return runOperation({ module: "ecommerce", action: "get", userId }, async () => {
    const store = getDashboardStore();
    await syncDashboardCatalogWithBilling();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "ecommerce");

    return {
      products: store.listProducts(userId),
      purchases: store.listPurchases(userId),
      invoices: store.listInvoices(userId)
    };
  });
}

export async function purchaseEcommerceProduct(userId: string, productId: string) {
  return runOperation(
    { module: "ecommerce", action: "purchase", userId, backupReason: "ecommerce_purchase" },
    async () => {
      try {
        const store = getDashboardStore();
        await syncDashboardCatalogWithBilling();
        const user = store.toPublicUser(store.getOrCreateUser(userId));
        const access = resolveModuleAccess(user);
        assertAccess(access, "ecommerce");
        const selectedProduct = store.validateProductPurchase(userId, productId);

        let billedAmount = selectedProduct.priceUsd;
        try {
          const billedCharge = await chargeBillingActivity({
            userId: user.id,
            region: user.country,
            event: {
              engine: "ecommerce",
              eventId: `dashboard-ecommerce-${productId}-${Date.now()}`,
              amount: selectedProduct.priceUsd,
              details: {
                productId,
                tier: user.tier
              }
            },
            idempotencyKey: `dashboard-ecommerce-${user.id}-${productId}-${Date.now()}`
          });
          billedAmount =
            billedCharge && typeof billedCharge.amount === "number"
              ? Number((billedCharge.amount as number).toFixed(2))
              : selectedProduct.priceUsd;
        } catch (error) {
          throw new DashboardServiceError(
            "billing_engine_charge_failed",
            502,
            error instanceof Error ? error.message : "Failed to authorize charge in billing engine"
          );
        }

        return {
          purchase: store.purchaseProduct(userId, productId, { amountUsd: billedAmount }),
          purchases: store.listPurchases(userId),
          invoices: store.listInvoices(userId)
        };
      } catch (error: unknown) {
        const err = error as Error & { code?: string; message: string };
        if (err.message === "paid_tier_kyc_required") {
          throw new DashboardServiceError(
            "paid_tier_kyc_required",
            403,
            "Full KYC is required before purchasing paid-tier offerings"
          );
        }
        if (err.message === "tier_upgrade_required") {
          throw new DashboardServiceError(
            "tier_upgrade_required",
            403,
            "Upgrade your tier to purchase this product"
          );
        }
        if (err.message === "product_not_found") {
          throw new DashboardServiceError("product_not_found", 404, "Product not found");
        }
        if (err.code === "module_access_denied") {
          const reason = err.message || "";
          if (reason.includes("Full KYC")) {
            throw new DashboardServiceError(
              "paid_tier_kyc_required",
              403,
              "Full KYC is required before purchasing paid-tier offerings"
            );
          }
        }
        throw error;
      }
    }
  );
}

export async function getInsightsModule(userId: string) {
  return runOperation({ module: "insights", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "insights");

    return {
      recommendations: store.getRecommendations(userId),
      alerts: store.getAlerts(userId)
    };
  });
}

export async function getPlacesModule(userId: string) {
  return runOperation({ module: "places", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "places");

    const consents = store.getConsents(user.id);
    if (!canUseLocationFeatures(consents)) {
      throw new DashboardServiceError(
        "location_consent_required",
        403,
        "Enable location consent to use places and geocoding features"
      );
    }

    return {
      nearbyPlaces: await store.listNearbyPlaces(user.id),
      matchmaking: moduleEnabled(access, "matchmaking") ? store.listMatchmaking(user.id) : []
    };
  });
}

export async function getCommunicationModule(userId: string) {
  return runOperation({ module: "communication", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "communication");

    return {
      inbox: store.listInbox(userId),
      notifications: store.listNotifications(userId),
      announcements: store.listAnnouncements(),
      aiStatus: getPulscoAiStatus()
    };
  });
}

export async function askDashboardChatbot(userId: string, prompt: string) {
  return runOperation({ module: "communication", action: "chat", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "communication");

    const ai = await askPulscoAi({
      prompt,
      userId,
      language: user.preferredLanguage,
      context: {
        tier: user.tier,
        role: user.role,
        kycStatus: user.kycStatus,
        recommendations: store.getRecommendations(user.id).length,
        alerts: store.getAlerts(user.id).length
      }
    });

    return {
      response: ai.response,
      aiStatus: {
        available: ai.available,
        provider: ai.provider,
        mode: ai.mode
      }
    };
  });
}

export async function getMarketingModule(userId: string) {
  return runOperation({ module: "marketing", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "marketing");

    const consents = store.getConsents(user.id);
    if (!canUseMarketing(consents)) {
      throw new DashboardServiceError(
        "marketing_consent_required",
        403,
        "Marketing consent is required before campaign analytics can be displayed"
      );
    }

    return {
      campaigns: store.listCampaignMetrics(user.id)
    };
  });
}

export async function getSecurityModule(userId: string) {
  return runOperation({ module: "security", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "security");

    return {
      consents: store.getConsents(user.id),
      access,
      complianceProfile: user.complianceProfile
    };
  });
}

export async function updateSecurityModule(userId: string, input: DashboardSecurityUpdate) {
  return runOperation(
    { module: "security", action: "update", userId, backupReason: "security_consent_update" },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "security");

      return {
        consents: input.consents
          ? store.updateConsents(userId, input.consents)
          : store.getConsents(userId)
      };
    }
  );
}

export async function getLocalizedDashboardDictionary(userId: string, targetLanguage?: string) {
  return runOperation({ module: "localization", action: "dictionary", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const language = targetLanguage || user.preferredLanguage;
    const translated = await translateDashboardDictionary(
      BASE_DASHBOARD_DICTIONARY,
      language,
      "en"
    );

    return {
      language,
      provider: translated.provider,
      dictionary: translated.dictionary
    };
  });
}

export async function recordDashboardInteraction(event: DashboardInteractionEvent) {
  return runOperation(
    { module: "interactions", action: event.eventType, userId: event.userId },
    async () => {
      const store = getDashboardStore();
      store.addInteraction(event);
      await forwardDashboardInteraction(event);

      return {
        accepted: true,
        queued: true,
        count: store.listRecentInteractions(event.userId).length
      };
    }
  );
}

export async function getOpsModule(userId: string) {
  return runOperation({ module: "operations", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "operations");

    return {
      metrics: store.listOpsMetrics(),
      backups: store.listBackups(),
      interactionsLast24h: store
        .listRecentInteractions(userId)
        .filter((entry) => Date.now() - entry.timestamp < 86_400_000).length
    };
  });
}

export async function getReportingModule(userId: string) {
  return runOperation({ module: "reporting", action: "get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "reporting");

    const fallback = store.getReportingModule(user.id);
    const upstream = await fetchReportingServiceData(user.id);

    return {
      reporting: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function getFraudModule(userId: string) {
  return runOperation({ module: "reporting", action: "fraud_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "reporting");

    const fallback = store.getFraudModule(user.id);
    const upstream = await fetchFraudServiceData(user.id);

    return {
      fraud: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function getIdentityModule(userId: string) {
  return runOperation({ module: "security", action: "identity_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "security");

    const fallback = store.getIdentityModule(user.id);
    const upstream = await fetchIdentityServiceData(user.id);

    return {
      identity: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function enableIdentityTwoFactor(userId: string) {
  return runOperation(
    {
      module: "security",
      action: "identity_enable_2fa",
      userId,
      backupReason: "identity_2fa_enable"
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "security");

      const identity = store.enableTwoFactor(user.id);
      return { identity };
    }
  );
}

export async function getBillingModule(userId: string) {
  return runOperation({ module: "subscription", action: "billing_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "subscription");

    const fallback = store.listBillingModule(user.id);
    const upstream = await fetchBillingServiceData(user.id);

    return {
      billing: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function runBillingAction(
  userId: string,
  action: "create" | "renew" | "upgrade" | "cancel",
  payload?: Record<string, unknown>
) {
  return runOperation(
    {
      module: "subscription",
      action: `billing_${action}`,
      userId,
      backupReason: `billing_${action}`
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));

      // Determine the target tier for access check
      const targetTier =
        payload?.tier === "premium" || payload?.tier === "enterprise" || payload?.tier === "basic"
          ? payload.tier
          : action === "create"
            ? "basic"
            : user.tier;

      // Create a mock user with target tier for access check
      const userForAccess = { ...user, tier: targetTier };
      const access = resolveModuleAccess(userForAccess as DashboardUser);
      assertAccess(access, "subscription");

      try {
        await assertEmergencyActionAllowed({
          feature: "billing",
          action,
          region: user.country
        });
      } catch (error) {
        if (error instanceof EmergencyProtocolBlockedError) {
          throw new DashboardServiceError("emergency_protocol_enforced", 423, error.message);
        }
        throw error;
      }

      await syncDashboardCatalogWithBilling();
      let billingActionResult: Record<string, unknown> | null = null;
      try {
        billingActionResult = await performBillingServiceAction(user.id, action, payload);
      } catch (error) {
        throw new DashboardServiceError(
          "billing_engine_action_failed",
          502,
          error instanceof Error ? error.message : "Failed to execute billing action"
        );
      }

      if (action === "cancel") {
        const upstream = await fetchBillingServiceData(user.id);
        return {
          billing: {
            ...store.cancelBillingSubscription(user.id),
            ...(upstream || {})
          },
          actionResult: billingActionResult || { mode: "fallback" }
        };
      }

      if (action === "upgrade" || action === "create") {
        const nextTier =
          payload?.tier === "premium" || payload?.tier === "enterprise" || payload?.tier === "basic"
            ? payload.tier
            : action === "create"
              ? "basic"
              : "premium";
        store.updateTier(user.id, nextTier);
      }

      const upstream = await fetchBillingServiceData(user.id);

      return {
        billing: {
          ...store.renewBillingSubscription(user.id),
          ...(upstream || {})
        },
        actionResult: billingActionResult || { mode: "fallback" }
      };
    }
  );
}

export async function getPlacesOperationsModule(userId: string) {
  return runOperation({ module: "places", action: "places_ops_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "places");

    const consents = store.getConsents(user.id);
    if (!canUseLocationFeatures(consents)) {
      throw new DashboardServiceError(
        "location_consent_required",
        403,
        "Enable location consent to manage places"
      );
    }

    const fallback = store.listPlacesOperations(user.id);
    const upstream = await fetchPlacesServiceData(user.id);

    return {
      placesOperations: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function runPlacesOperationsAction(
  userId: string,
  action: "create_place" | "create_booking" | "cancel_booking",
  payload: Record<string, unknown>
) {
  return runOperation(
    {
      module: "places",
      action: `places_ops_${action}`,
      userId,
      backupReason: `places_ops_${action}`
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "places");
      const consents = store.getConsents(user.id);
      if (!canUseLocationFeatures(consents)) {
        throw new DashboardServiceError(
          "location_consent_required",
          403,
          "Enable location consent to manage places"
        );
      }

      try {
        await assertEmergencyActionAllowed({
          feature: "places",
          action,
          region: user.country
        });
      } catch (error) {
        if (error instanceof EmergencyProtocolBlockedError) {
          throw new DashboardServiceError("emergency_protocol_enforced", 423, error.message);
        }
        throw error;
      }

      await performPlacesServiceAction(action, payload as Record<string, unknown>);

      if (action === "create_place") {
        return {
          placesOperations: store.createManagedPlace(user.id, {
            name: String(payload.name || "New Place"),
            category: String(payload.category || "workspace")
          })
        };
      }
      if (action === "create_booking") {
        const requestedAmount = Number(payload.totalUsd || 0);
        let billingCharge: Record<string, unknown> | null = null;
        try {
          billingCharge = await chargeBillingActivity({
            userId: user.id,
            region: user.country,
            event: {
              engine: "places",
              eventId: `dashboard-places-booking-${Date.now()}`,
              amount: requestedAmount,
              units: 1,
              details: {
                placeId: String(payload.placeId || "unknown"),
                mode: "booking",
                bookingAmountUsd: requestedAmount
              }
            },
            idempotencyKey: `dashboard-places-booking-${user.id}-${Date.now()}`
          });
        } catch (error) {
          throw new DashboardServiceError(
            "billing_engine_places_charge_failed",
            502,
            error instanceof Error ? error.message : "Failed to execute places charge"
          );
        }
        const chargedAmount =
          billingCharge && typeof billingCharge.amount === "number"
            ? Number((billingCharge.amount as number).toFixed(2))
            : requestedAmount;

        return {
          placesOperations: store.createPlaceBooking(user.id, {
            placeId: String(payload.placeId || "unknown"),
            totalUsd: chargedAmount,
            startAt: String(payload.startAt || new Date().toISOString()),
            endAt: String(payload.endAt || new Date(Date.now() + 3_600_000).toISOString())
          })
        };
      }

      return {
        placesOperations: store.cancelPlaceBooking(user.id, String(payload.bookingId || ""))
      };
    }
  );
}

export async function getMatchmakingOperationsModule(userId: string) {
  return runOperation(
    { module: "matchmaking", action: "matchmaking_ops_get", userId },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "matchmaking");

      const fallback = store.listMatchmakingOperations(user.id);
      const upstream = await fetchMatchmakingServiceData(user.id);

      return {
        matchmakingOperations: {
          ...fallback,
          ...(upstream || {})
        }
      };
    }
  );
}

export async function runMatchmakingOperationsAction(
  userId: string,
  action: "create_brief" | "submit_proposal" | "create_contract",
  payload: Record<string, unknown>
) {
  return runOperation(
    {
      module: "matchmaking",
      action: `matchmaking_ops_${action}`,
      userId,
      backupReason: `matchmaking_ops_${action}`
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "matchmaking");

      if (action === "create_brief") {
        return {
          matchmakingOperations: store.createBrief(user.id, String(payload.title || "New Brief"))
        };
      }
      if (action === "submit_proposal") {
        return {
          matchmakingOperations: store.submitProposal(
            user.id,
            String(payload.briefId || ""),
            Number(payload.amountUsd || 0)
          )
        };
      }
      return {
        matchmakingOperations: store.createContract(user.id, String(payload.proposalId || ""))
      };
    }
  );
}

export async function getGovernanceModule(userId: string) {
  return runOperation({ module: "operations", action: "governance_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "operations");

    const fallback = store.getGovernanceModule(user.id);
    const upstream = await fetchGovernanceServiceData(user.id);

    return {
      governance: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

export async function requestGovernanceArbitration(userId: string) {
  return runOperation(
    {
      module: "operations",
      action: "governance_arbitration_request",
      userId,
      backupReason: "governance_arbitration_request"
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "operations");

      return {
        governance: store.requestArbitration(user.id)
      };
    }
  );
}

export async function reviewCsiRecommendation(
  userId: string,
  recommendationId: string,
  decision: "approved" | "rejected"
) {
  return runOperation(
    {
      module: "operations",
      action: `csi_recommendation_${decision}`,
      userId,
      backupReason: `csi_recommendation_${decision}`
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      const access = resolveModuleAccess(user);
      assertAccess(access, "operations");

      store.updateRecommendationStatus(user.id, recommendationId, decision);
      return {
        governance: store.getGovernanceModule(user.id),
        recommendations: store.getRecommendations(user.id)
      };
    }
  );
}

export async function getLocalizationAdvancedModule(userId: string) {
  return runOperation({ module: "core", action: "localization_advanced_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const fallback = store.getLocalizationAdvancedModule(user.id);
    const upstream = await fetchLocalizationHealthData();

    return {
      localizationAdvanced: {
        ...fallback,
        ...(upstream
          ? {
              providerHealth: upstream.providerHealth || fallback.providerHealth,
              languageCoverage: upstream.languageCoverage || fallback.languageCoverage
            }
          : {})
      }
    };
  });
}

export async function getProximityAdvancedModule(userId: string) {
  return runOperation({ module: "places", action: "proximity_advanced_get", userId }, async () => {
    const store = getDashboardStore();
    const user = store.toPublicUser(store.getOrCreateUser(userId));
    const access = resolveModuleAccess(user);
    assertAccess(access, "places");
    const consents = store.getConsents(user.id);
    if (!canUseLocationFeatures(consents)) {
      throw new DashboardServiceError(
        "location_consent_required",
        403,
        "Enable location consent to use proximity analytics"
      );
    }

    const fallback = store.getProximityAdvancedModule(user.id);
    const upstream = await fetchProximityServiceData();

    return {
      proximityAdvanced: {
        ...fallback,
        ...(upstream || {})
      }
    };
  });
}

function listPartnerInvestorApplications(userId: string, type?: PartnerInvestorApplicationType) {
  const entries = Array.from(partnerInvestorApplications.values()).filter((entry) => {
    if (entry.userId !== userId) return false;
    if (type && entry.type !== type) return false;
    return true;
  });

  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function assertPartnerInvestorEligibility(user: DashboardUser) {
  if (user.tier !== "enterprise") {
    throw new DashboardServiceError(
      "enterprise_required",
      403,
      "Upgrade to Enterprise to submit partner or investor applications."
    );
  }
}

export async function submitPartnerInvestorApplication(
  userId: string,
  type: PartnerInvestorApplicationType,
  payload: Record<string, unknown>
) {
  return runOperation(
    {
      module: "operations",
      action: `${type}_application_submit`,
      userId,
      backupReason: `${type}_application_submit`
    },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      assertPartnerInvestorEligibility(user);

      const now = new Date().toISOString();
      const application: PartnerInvestorApplication = {
        id: `app-${randomUUID()}`,
        userId: user.id,
        type,
        status: "pending_review",
        createdAt: now,
        updatedAt: now,
        submittedByRole: user.role,
        payload
      };

      partnerInvestorApplications.set(application.id, application);

      return {
        application,
        applications: listPartnerInvestorApplications(user.id, type)
      };
    }
  );
}

export async function getPartnerInvestorApplications(
  userId: string,
  type: PartnerInvestorApplicationType
) {
  return runOperation(
    { module: "operations", action: `${type}_application_get`, userId },
    async () => {
      const store = getDashboardStore();
      const user = store.toPublicUser(store.getOrCreateUser(userId));
      return {
        applications: listPartnerInvestorApplications(user.id, type)
      };
    }
  );
}

export async function reviewPartnerInvestorApplication(
  applicationId: string,
  decision: "approved" | "rejected",
  reviewer: string,
  notes?: string
) {
  return runOperation(
    {
      module: "operations",
      action: `application_review_${decision}`,
      backupReason: `application_review_${decision}`
    },
    async () => {
      const existing = partnerInvestorApplications.get(applicationId);
      if (!existing) {
        throw new DashboardServiceError("application_not_found", 404, "Application not found");
      }

      const updated: PartnerInvestorApplication = {
        ...existing,
        status: decision,
        updatedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: reviewer,
        notes: notes?.trim() || existing.notes
      };

      partnerInvestorApplications.set(applicationId, updated);
      return { application: updated };
    }
  );
}
