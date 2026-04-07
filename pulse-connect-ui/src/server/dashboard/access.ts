import {
  DashboardFeatureAccess,
  DashboardModuleKey,
  DashboardRole,
  DashboardTier,
  DashboardUser,
  KycStatus
} from "@/types/dashboard";

const MODULES_BY_TIER: Record<DashboardTier, DashboardModuleKey[]> = {
  basic: ["core", "profile", "communication", "insights", "security"],
  premium: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "ecommerce",
    "marketing",
    "places"
  ],
  enterprise: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "ecommerce",
    "marketing",
    "places",
    "matchmaking",
    "reporting",
    "operations"
  ]
};

const ALL_MODULES: DashboardModuleKey[] = [
  "core",
  "profile",
  "communication",
  "insights",
  "security",
  "subscription",
  "ecommerce",
  "marketing",
  "places",
  "matchmaking",
  "reporting",
  "operations"
];

const MODULES_BY_ROLE: Record<DashboardRole, DashboardModuleKey[]> = {
  admin: ALL_MODULES,
  individual: ["core", "profile", "communication", "insights", "security", "subscription"],
  business: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "ecommerce",
    "marketing",
    "places"
  ],
  organisation: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "ecommerce",
    "marketing",
    "places",
    "reporting"
  ],
  investor: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "reporting"
  ],
  partner: [
    "core",
    "profile",
    "communication",
    "insights",
    "security",
    "subscription",
    "places",
    "ecommerce",
    "reporting"
  ]
};

export function paidTierRequiresFullKyc(tier: DashboardTier): boolean {
  return tier === "premium" || tier === "enterprise";
}

export function isFullKyc(status: KycStatus): boolean {
  return status === "verified";
}

export function resolveModuleAccess(user: DashboardUser): DashboardFeatureAccess[] {
  const tierModules = new Set(MODULES_BY_TIER[user.tier]);
  const roleModules = new Set(MODULES_BY_ROLE[user.role]);
  const needsPaidTierKyc = paidTierRequiresFullKyc(user.tier);

  return ALL_MODULES.map((module) => {
    if (!tierModules.has(module)) {
      return {
        module,
        enabled: false,
        reason: `Not available for ${user.tier} tier`
      };
    }

    if (!roleModules.has(module)) {
      return {
        module,
        enabled: false,
        reason: `Role ${user.role} does not have access to this module`
      };
    }

    const paidTierOnly =
      module === "ecommerce" ||
      module === "marketing" ||
      module === "reporting" ||
      module === "matchmaking";

    if (paidTierOnly && needsPaidTierKyc && !isFullKyc(user.kycStatus)) {
      return {
        module,
        enabled: false,
        reason: "Full KYC verification required for paid tier features"
      };
    }

    return {
      module,
      enabled: true
    };
  });
}

export function moduleEnabled(
  access: DashboardFeatureAccess[],
  module: DashboardModuleKey
): boolean {
  return access.some((entry) => entry.module === module && entry.enabled);
}
