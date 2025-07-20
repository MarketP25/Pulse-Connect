import React from "react";
import { usePlan } from "@/context/PlanContext";
import { useRole } from "@/context/RoleContext";
import { FeatureLabels } from "@/config/FeatureLabels";

export default function UpgradePrompt() {
  const { tier, source, canUse } = usePlan();
  const { language } = useRole();

  // Define features you want to surface in this prompt
  const allFeatures = ["videoCall", "voiceMessage", "chat"];

  const gated = allFeatures.filter((feature) => !canUse(feature));

  if (gated.length === 0) return null;

  return (
    <div className="bg-blue-100 text-blue-900 p-3 text-sm rounded shadow-sm mx-4 my-2">
      <p>
        ⚡ Your <strong>{tier}</strong> plan ({source}-funded) doesn't unlock:
        {gated.map((feature, i) => {
          const label =
            FeatureLabels[language]?.[feature] ??
            FeatureLabels["en"]?.[feature] ??
            feature;

          return (
            <span key={feature}>
              {" "}
              <strong>{label}</strong>
              {i < gated.length - 1 ? "," : "."}
            </span>
          );
        })}
      </p>
      <button className="mt-2 px-3 py-1 bg-blue-700 text-white text-sm rounded hover:bg-blue-800">
        {language === "sw"
          ? "Boresha mpango wako"
          : language === "yo"
          ? "Muṣiṣẹpọ eto rẹ"
          : language === "ar"
          ? "قم بترقية خطتك"
          : language === "hi"
          ? "अपनी योजना को अपग्रेड करें"
          : language === "pt"
          ? "Atualize seu plano"
          : "Upgrade your plan"}
      </button>
    </div>
  );
}