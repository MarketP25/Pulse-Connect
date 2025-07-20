import React, { createContext, useContext } from "react";
import { useRole } from "@/context/RoleContext";
import { FeatureMap } from "@/config/FeatureMap";

type PlanTier = "free" | "pro" | "team" | "enterprise";
type FundingSource = "user" | "org";

interface PlanContextType {
  tier: PlanTier;
  source: FundingSource;
  features: string[];
  canUse: (feature: string) => boolean;
}

const PlanContext = createContext<PlanContextType>({
  tier: "free",
  source: "user",
  features: [],
  canUse: () => false
});

export const usePlan = () => useContext(PlanContext);

export const PlanProvider = ({ children }: { children: React.ReactNode }) => {
  const { plan, fundingSource, features, role } = useRole();

  const tierRank: Record<PlanTier, number> = {
    free: 0,
    pro: 1,
    team: 2,
    enterprise: 3
  };

  const canUse = (feature: string): boolean => {
    const config = FeatureMap[feature];
    if (!config) return false;

    const meetsTier = tierRank[plan] >= tierRank[config.requiredTier];

    const roleAllowed = Array.isArray(config.enabledForRoles)
      ? config.enabledForRoles.includes(role ?? "guest")
      : true;

    const orgOverride = config.orgFundable === true && fundingSource === "org";

    return (meetsTier && roleAllowed) || orgOverride;
  };

  return (
    <PlanContext.Provider value={{ tier: plan, source: fundingSource, features, canUse }}>
      {children}
    </PlanContext.Provider>
  );
};