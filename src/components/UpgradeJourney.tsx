import React from "react";
import { useSession } from "@/hooks/useSession";

const tiers = ["Starter", "Premium", "Visionary"] as const;

const featuresByTier: Record<(typeof tiers)[number], string[]> = {
  Starter: ["Text Chat", "Basic Posts"],
  Premium: ["Video Post", "Voice Message"],
  Visionary: ["Realtime Sync", "Team Broadcast"]
};

export default function UpgradeJourney() {
  const { user, org } = useSession();
  const plan = org?.plan || user?.plan || "Starter";
  const currentTierIndex = tiers.indexOf(plan as (typeof tiers)[number]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-4">🚀 Upgrade Journey</h2>
      <ul className="space-y-4">
        {tiers.map((tier) => {
          const isUnlocked = tiers.indexOf(tier) <= currentTierIndex;
          return (
            <li
              key={tier}
              className={`p-4 rounded border ${
                isUnlocked ? "border-green-500 bg-green-50" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className={`font-semibold ${isUnlocked ? "text-green-700" : "text-gray-700"}`}>
                  {tier}
                </span>
                {isUnlocked && <span className="text-green-600 text-sm">Unlocked ✅</span>}
              </div>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {featuresByTier[tier].map((feature: string) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}