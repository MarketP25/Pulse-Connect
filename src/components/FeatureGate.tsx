import React from "react";
import { usePlan } from "@/context/PlanContext";
import { useRole } from "@/context/RoleContext";

interface FeatureGateProps {
  feature: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export default function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { canUse } = usePlan();
  const { role, language } = useRole();

  if (canUse(feature)) return <>{children}</>;

  // Optional: localized fallback messaging
  const fallbackMessages: Record<string, Record<string, string>> = {
    en: {
      guest: "Upgrade to unlock this feature.",
      teamAdmin: "Your team needs this feature—upgrade to enable it.",
      default: "This feature is part of a premium plan."
    },
    sw: {
      guest: "Boresha ili kufungua kipengele hiki.",
      teamAdmin: "Timu yako inahitaji kipengele hiki—boresha ili kukiwezesha.",
      default: "Kipengele hiki ni sehemu ya mpango wa juu."
    }
  };

  const message =
    fallbackMessages[language]?.[role ?? "default"] ??
    fallbackMessages[language]?.default ??
    "Upgrade required.";

  return (
    <div className="bg-yellow-50 text-yellow-900 p-3 text-sm rounded shadow-sm mx-4 my-2">
      ⚠️ {message}
      {fallback && <div className="mt-2">{fallback}</div>}
    </div>
  );
}