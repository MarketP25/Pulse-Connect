import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "@/hooks/useSession";

type FundingSource = "org" | "user" | "none";

const FundingContext = createContext<FundingSource>("none");

export function FundingProvider({ children }: { children: React.ReactNode }) {
  const { user, org } = useSession();

  const funding = useMemo<FundingSource>(() => {
    if (org?.plan) return "org";
    if (user?.plan) return "user";
    return "none";
  }, [org?.plan, user?.plan]);

  return <FundingContext.Provider value={funding}>{children}</FundingContext.Provider>;
}

export function useFunding() {
  return useContext(FundingContext);
}
