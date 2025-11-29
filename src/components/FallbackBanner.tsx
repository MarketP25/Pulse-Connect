import React from "react";
import { useRole } from "@/context/RoleContext";
import { usePlan } from "@/context/PlanContext";
import { FeatureMap } from "@/config/FeatureMap";

interface FallbackBannerProps {
  feature: string;
  className?: string;
}

export default function FallbackBanner({ feature, className = "" }: FallbackBannerProps) {
  const { role, language, fundingSource } = useRole();
  const { tier } = usePlan();
  const config = FeatureMap[feature];

  if (!config) return null;

  const requiredTier = config.requiredTier;
  const isOrgFunded = fundingSource === "org";

  const copy: Record<string, Record<string, string>> = {
    en: {
      guest: `Upgrade to access ${feature}.`,
      teamAdmin: `Your team needs ${feature}—upgrade to enable it.`,
      default: `${feature} is included in the ${requiredTier} plan.`
    },
    sw: {
      guest: `Boresha ili kutumia ${feature}.`,
      teamAdmin: `Timu yako inahitaji ${feature}—boresha ili kuiwezesha.`,
      default: `${feature} ni sehemu ya mpango wa ${requiredTier}.`
    },
    yo: {
      guest: `Muṣiṣẹpọ lati wọle si ${feature}.`,
      teamAdmin: `Ẹgbẹ rẹ nilo ${feature}—muṣiṣẹpọ lati ṣiṣẹ.`,
      default: `${feature} wa ninu eto ${requiredTier}.`
    },
    ar: {
      guest: `قم بالترقية للوصول إلى ${feature}.`,
      teamAdmin: `فريقك يحتاج إلى ${feature}—قم بالترقية لتفعيله.`,
      default: `${feature} متاح في خطة ${requiredTier}.`
    },
    hi: {
      guest: `${feature} का उपयोग करने के लिए योजना को अपग्रेड करें।`,
      teamAdmin: `आपकी टीम को ${feature} की आवश्यकता है—इसे सक्षम करने के लिए अपग्रेड करें।`,
      default: `${feature} ${requiredTier} योजना में शामिल है।`
    },
    pt: {
      guest: `Atualize para acessar ${feature}.`,
      teamAdmin: `Sua equipe precisa de ${feature}—atualize para habilitar.`,
      default: `${feature} está incluído no plano ${requiredTier}.`
    }
  };

  const langCopy = copy[language] ?? copy["en"];
  const message =
    (langCopy?.[role ?? "default"] ??
      langCopy?.default ??
      copy["en"]?.[role ?? "default"] ??
      copy["en"]?.default ??
      "Upgrade required.");

  return (
    <div className={`bg-yellow-100 text-yellow-900 p-3 text-sm rounded shadow-sm mx-4 my-2 ${className}`}>
      ⚠️ {isOrgFunded
        ? `This feature is gated by your org’s current plan. ${message}`
        : message}
    </div>
  );
}