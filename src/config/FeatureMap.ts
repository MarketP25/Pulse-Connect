type PlanTier = "free" | "pro" | "team" | "enterprise";
type Role = "admin" | "editor" | "viewer" | "teamAdmin" | "globalAdmin" | "guest";
type FundingSource = "user" | "org";

interface FeatureConfig {
  requiredTier: PlanTier;
  enabledForRoles?: Role[];
  orgFundable?: boolean; // true if org can unlock for team
}

export const FeatureMap: Record<string, FeatureConfig> = {
  videoCall: {
    requiredTier: "pro",
    enabledForRoles: ["admin", "editor", "teamAdmin"],
    orgFundable: true
  },
  voiceMessage: {
    requiredTier: "pro",
    enabledForRoles: ["editor", "viewer", "guest"],
    orgFundable: true
  },
  chat: {
    requiredTier: "free",
    enabledForRoles: ["admin", "editor", "viewer", "guest"],
    orgFundable: false
  },
  richPost: {
    requiredTier: "team",
    enabledForRoles: ["editor", "admin"],
    orgFundable: true
  },
  orgAnalytics: {
    requiredTier: "enterprise",
    enabledForRoles: ["globalAdmin", "teamAdmin"],
    orgFundable: true
  }
};