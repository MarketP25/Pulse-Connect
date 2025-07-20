import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FeatureLabels } from "@/config/FeatureLabels";
import { useConfettiTheme } from "@/config/ConfettiTheme";

interface ToastItem {
  features: string[];
  language: keyof typeof FeatureLabels;
  fundingSource: "user" | "org";
}

interface ToastQueueProps {
  queue: ToastItem[];
}

export default function BrandToastQueue({ queue }: ToastQueueProps) {
  const [index, setIndex] = useState(0);
  const colors = useConfettiTheme();

  useEffect(() => {
    const current = queue[index];
    if (!current) return;

    const { features, language, fundingSource } = current;

    const featureList = features
      .map((f) => FeatureLabels[language]?.[f] ?? FeatureLabels["en"]?.[f] ?? f)
      .join(", ");

    const message =
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

    toast.success(
      <div className="sparkle-trail flex items-center gap-2 shadow-lg rounded-lg px-3 py-2 border border-blue-300">
        <img src="/icon.png" alt="PulseConnect" className="w-5 h-5" />
        <div className="flex flex-col">
          <span className="font-medium">{message}</span>
          <span className="text-xs text-yellow-600 mt-1">Tier Unlocked 🚀</span>
        </div>
      </div>,
      {
        duration: 4000,
        style: {
          background: colors[1],
          borderColor: colors[0],
          color: colors[2]
        }
      }
    );

    const timer = setTimeout(() => {
      setIndex((prev) => prev + 1);
    }, 4200);

    return () => clearTimeout(timer);
  }, [index, queue, colors]);

  return null;
}