import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { FeatureLabels } from "@/config/FeatureLabels";
import { useConfettiTheme } from "@/config/ConfettiTheme";

interface BrandCelebrationProps {
  features: string[];
  language: string;
  fundingSource: "user" | "org";
  onDone?: () => void;
}

export default function BrandCelebration({
  features,
  language,
  fundingSource,
  onDone
}: BrandCelebrationProps) {
  const regionalColors = useConfettiTheme();

  useEffect(() => {
    confetti({
      particleCount: 75,
      spread: 80,
      origin: { x: 0.5, y: 0.6 },
      angle: 90,
      gravity: 0.9,
      scalar: 1.2,
      ticks: 180,
      colors:
        fundingSource === "org"
          ? regionalColors
          : ["#FACC15", "#4ADE80", "#60A5FA"] // fallback for user-funded
    });

    const timer = setTimeout(() => {
      if (onDone) onDone();
    }, 3000);

    return () => clearTimeout(timer);
  }, [features, language, fundingSource, onDone, regionalColors]);

  const featureList = features
    .map((f) => FeatureLabels[language]?.[f] ?? FeatureLabels["en"]?.[f] ?? f)
    .join(", ");

  const message: string =
    fundingSource === "org"
      ? {
          en: `Your org unlocked: ${featureList}`,
          sw: `Shirika limefungua: ${featureList}`,
          yo: `Ẹgbẹ rẹ ti ṣí: ${featureList}`,
          ar: `منظمتك فتحت: ${featureList}`,
          hi: `आपकी संस्था ने अनलॉक किया है: ${featureList}`,
          pt: `Sua organização desbloqueou: ${featureList}`
        }[language] ?? `Your org unlocked: ${featureList}`
      : {
          en: `You unlocked: ${featureList}`,
          sw: `Umefungua: ${featureList}`,
          yo: `O ti ṣí: ${featureList}`,
          ar: `لقد فتحت: ${featureList}`,
          hi: `आपने अनलॉक किया है: ${featureList}`,
          pt: `Você desbloqueou: ${featureList}`
        }[language] ?? `You unlocked: ${featureList}`;

  return (
    <div className="flex items-center gap-3 bg-white rounded shadow-lg p-4 text-blue-900">
      <img src="/icon.png" alt="PulseConnect" className="w-6 h-6 animate-pulse" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}