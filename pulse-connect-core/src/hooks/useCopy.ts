import { useSession } from "@/hooks/useSession";
import { copy } from "@/config/Copy";

export function useCopy() {
  const { user } = useSession();
  const locale = user.locale ?? "en";

  return {
    upgradeText: copy.upgrade[locale],
    fallbackText: copy.fallback[locale]
  };
}
