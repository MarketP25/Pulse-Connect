import { FeatureLabels } from "@/config/FeatureLabels";

export function generateUpgradeToast({
  features,
  language,
  fundingSource,
}: {
  features: string[];
  language: string;
  fundingSource: "user" | "org";
}) {
  const featureList = features
    .map((f) => FeatureLabels[language]?.[f] ?? FeatureLabels["en"]?.[f] ?? f)
    .join(", ");

  const copy: Record<string, string> = {
    en:
      fundingSource === "org"
        ? `Your org has unlocked: ${featureList}`
        : `You’ve unlocked: ${featureList}`,
    sw:
      fundingSource === "org"
        ? `Shirika limefungua: ${featureList}`
        : `Umefungua: ${featureList}`,
    yo:
      fundingSource === "org"
        ? `Ẹgbẹ rẹ ti ṣí: ${featureList}`
        : `O ti ṣí: ${featureList}`,
    ar:
      fundingSource === "org"
        ? `منظمتك فتحت: ${featureList}`
        : `لقد فتحت: ${featureList}`,
    hi:
      fundingSource === "org"
        ? `आपकी संस्था ने अनलॉक किया है: ${featureList}`
        : `आपने अनलॉक किया है: ${featureList}`,
    pt:
      fundingSource === "org"
        ? `Sua organização desbloqueou: ${featureList}`
        : `Você desbloqueou: ${featureList}`,
  };

  const message = copy[language] ?? copy["en"];

  return (
    <div className="flex items-center gap-2">
      <img src="/icon.png" alt="PulseConnect" className="w-5 h-5" />
      <span className="font-medium">{message}</span>
    </div>
  );
}
