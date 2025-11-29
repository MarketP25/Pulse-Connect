import type { Plan, LocalizedString, Locale } from "@/types/plan";

const LOCALES: Locale[] = ["en", "es", "fr", "de", "sw"];

function localize(value: string): LocalizedString {
  return LOCALES.reduce<LocalizedString>((acc, locale) => {
    acc[locale] = value;
    return acc;
  }, {} as LocalizedString);
}

export const planData: Plan[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: localize("Basic"),
    description: localize("List up to 10 products/month"),
    region: "US",
    price: 10,
    currency: { en: "$", es: "€", fr: "€", de: "€", sw: "KSh" },
    features: [localize("10 listings"), localize("Email support")],
    celebrations: {
      en: { confettiColors: ["#FFD700", "#FF8C00"], soundEffect: "/sounds/cheer.mp3" },
      es: { confettiColors: ["#FF0000", "#FFFF00"], soundEffect: "/sounds/olé.mp3" },
      fr: { confettiColors: ["#0000FF", "#FFFFFF"], soundEffect: "/sounds/vive.mp3" },
      de: { confettiColors: ["#000000", "#FF0000"], soundEffect: "/sounds/prost.mp3" },
      sw: { confettiColors: ["#228B22", "#ADFF2F"], soundEffect: "/sounds/asante.mp3" },
    },
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: localize("Pro"),
    description: localize("List up to 100 products/month + analytics"),
    region: "US",
    price: 50,
    currency: { en: "$", es: "€", fr: "€", de: "€", sw: "KSh" },
    features: [
      localize("100 listings"),
      localize("Priority support"),
      localize("Built-in analytics"),
    ],
    celebrations: {
      en: { confettiColors: ["#4B0082", "#8A2BE2"], soundEffect: "/sounds/cheer.mp3" },
      es: { confettiColors: ["#FF4500", "#32CD32"], soundEffect: "/sounds/olé.mp3" },
      fr: { confettiColors: ["#1E90FF", "#00CED1"], soundEffect: "/sounds/vive.mp3" },
      de: { confettiColors: ["#DAA520", "#B22222"], soundEffect: "/sounds/prost.mp3" },
      sw: { confettiColors: ["#FFD700", "#228B22"], soundEffect: "/sounds/asante.mp3" },
    },
  },
];

export function getAllPlans(): Plan[] {
  return planData;
}