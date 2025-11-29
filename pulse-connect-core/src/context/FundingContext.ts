import { useMemo } from "react";
import { useSession } from "@/hooks/useSession"; // assumes org + user data are here

type FundingSource = "org" | "user" | "none";

export function useFundingContext(): FundingSource {
  const { user, org } = useSession();

  return useMemo(() => {
    if (org?.plan) return "org";
    if (user?.plan) return "user";
    return "none";
  }, [user?.plan, org?.plan]);
}
