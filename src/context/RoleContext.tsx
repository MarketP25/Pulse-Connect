"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "@/firebase/config";

// Define supported roles
export type PulseConnectRole =
  | "admin"
  | "editor"
  | "viewer"
  | "teamAdmin"
  | "globalAdmin"
  | "guest"
  | null;

// Define funding source and plan tier
export type PlanTier = "free" | "pro" | "team" | "enterprise";
export type FundingSource = "user" | "org";

interface RoleContextType {
  role: PulseConnectRole;
  org: string | null;
  language: string;
  loading: boolean;
  plan: PlanTier;
  fundingSource: FundingSource;
  features: string[];
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  org: null,
  language: "en",
  loading: true,
  plan: "free",
  fundingSource: "user",
  features: [],
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<PulseConnectRole>(null);
  const [org, setOrg] = useState<string | null>(null);
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [fundingSource, setFundingSource] = useState<FundingSource>("user");
  const [features, setFeatures] = useState<string[]>([]);

  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const claims = tokenResult.claims;

          const claimRole = claims.role;
          const claimOrg = claims.org;
          const claimPlan = claims.plan;
          const claimFundingSource = claims.fundingSource;
          const claimFeatures = claims.features;

          const resolvedRole =
            typeof claimRole === "string"
              ? (claimRole as PulseConnectRole)
              : "guest";

          const resolvedOrg =
            typeof claimOrg === "string" ? claimOrg : null;

          const resolvedPlan =
            typeof claimPlan === "string" ? (claimPlan as PlanTier) : "free";

          const resolvedFunding =
            typeof claimFundingSource === "string"
              ? (claimFundingSource as FundingSource)
              : "user";

          const resolvedFeatures =
            Array.isArray(claimFeatures) ? claimFeatures : [];

          const browserLang = navigator.language.startsWith("sw")
            ? "sw"
            : "en";

          setRole(resolvedRole);
          setOrg(resolvedOrg);
          setLanguage(browserLang);
          setPlan(resolvedPlan);
          setFundingSource(resolvedFunding);
          setFeatures(resolvedFeatures);
        } catch (err) {
          // ...existing code...
          setRole("guest");
          setOrg(null);
          setLanguage("en");
          setPlan("free");
          setFundingSource("user");
          setFeatures([]);
        }
      } else {
        setRole("guest");
        setOrg(null);
        setLanguage("en");
        setPlan("free");
        setFundingSource("user");
        setFeatures([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [auth]);

  return (
    <RoleContext.Provider
      value={{
        role,
        org,
        language,
        loading,
        plan,
        fundingSource,
        features,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// Hook to access role, org, plan, funding, language, and features
export const useRole = () => useContext(RoleContext);