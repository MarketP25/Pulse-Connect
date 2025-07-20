import React, { ReactNode } from "react";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";
import { FeatureLabels } from "@/config/FeatureLabels";

interface CelebrateParams {
  features: string[];
  language: string;
  fundingSource: "user" | "org";
}

export function celebrateUpgrade({ features, language, fundingSource }: CelebrateParams): void {
  // 🎊 Confetti burst with type-safe config
  const confettiConfig: Parameters<typeof confetti>[0] = {
    particleCount: 75,
    spread: 80,
    origin: { x: 0.5, y: 0.6 },
    angle: 90,
    gravity: 0.9,
    scalar: 1.2,
    ticks: 180
  };

  confetti(confettiConfig);

  // 🌍 Localize feature list
  const featureList = features
    .map((f) => FeatureLabels[language]?.[f] ?? FeatureLabels["en"]?.[f] ?? f)
    .join(", ");

  const copy: Record<string, string> = {
    en: fundingSource === "org"
      ? `Your org has unlocked: ${featureList}`
      : `You’ve unlocked: ${featureList}`,
    sw: fundingSource === "org"
      ? `Shirika limefungua: ${featureList}`
      : `Umefungua: ${featureList}`,
    yo: fundingSource === "org"
      ? `Ẹgbẹ rẹ ti ṣí: ${featureList}`
      : `O ti ṣí: ${featureList}`,
    ar: fundingSource === "org"
      ? `منظمتك فتحت: ${featureList}`
      : `لقد فتحت: ${featureList}`,
    hi: fundingSource === "org"
      ? `आपकी संस्था ने अनलॉक किया है: ${featureList}`
      : `आपने अनलॉक किया है: ${featureList}`,
    pt: fundingSource === "org"
      ? `Sua organização desbloqueou: ${featureList}`
      : `Você desbloqueou: ${featureList}`
  };

  const message: string = copy[language] ?? copy["en"] ?? "Feature unlocked!";

  // 🔔 Toast with icon + animation
  const toastContent: ReactNode = (
    <div className="flex items-center gap-2 animate-pulse">
      <img src="/icon.png" alt="PulseConnect" className="w-5 h-5" />
      <span className="font-medium">{message}</span>
    </div>
  );

  toast.success(toastContent, { duration: 5000 });
}