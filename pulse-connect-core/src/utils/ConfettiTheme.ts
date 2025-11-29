// --- GLOBAL UX IMPROVEMENTS ---
// 1. RTL (Right-to-Left) language support helper
export function isRTL(lang: string): boolean {
  return ["ar", "he", "fa", "ur"].includes(lang);
}

// 2. Locale-based date, time, and currency formatting helpers
export function formatDate(date: Date, lang: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(lang, options).format(date);
}
export function formatCurrency(amount: number, currency: string, lang: string) {
  return new Intl.NumberFormat(lang, { style: "currency", currency }).format(amount);
}

// 3. ARIA and accessibility best practices (usage comment)
// - Use role="alert" for error/success messages
// - Use aria-label/aria-labelledby for all interactive elements
// - Ensure all controls are keyboard accessible
export const CONFETTI_THEMES: Record<string, string[]> = {
  en: ["#6366f1", "#f59e42", "#10b981", "#f43f5e"], // Indigo, orange, green, pink
  sw: ["#1c1c1c", "#f9d923", "#36ae7c", "#187498"], // Black, yellow, green, blue
  yo: ["#fecd1a", "#008751", "#ffffff", "#e30b17"], // Yoruba (Nigeria): yellow, green, white, red
  ar: ["#ce1126", "#fefefe", "#000000", "#239f40"], // Arabic (Egypt): red, white, black, green
  pt: ["#009c3b", "#ffdf00", "#002776", "#ffffff"], // Portuguese (Brazil): green, yellow, blue, white
  hi: ["#ff9933", "#138808", "#ffffff", "#000080"] // Hindi (India): orange, green, white, navy
};

export function getConfettiTheme(lang: string): string[] {
  return (
    CONFETTI_THEMES[lang] ?? CONFETTI_THEMES["en"] ?? ["#6366f1", "#f59e42", "#10b981", "#f43f5e"]
  );
}
import { useSession } from "@/hooks/useSession";

// 🎨 Region-tuned palettes
const palettes: Record<"KE" | "NG" | "BR" | "IN" | "EG" | "MX", string[]> = {
  KE: ["#fcbc05", "#008751", "#ffffff"], // Kenya
  NG: ["#008751", "#fecd1a", "#ffffff"], // Nigeria
  BR: ["#009c3b", "#ffdf00", "#002776"], // Brazil
  IN: ["#ff9933", "#138808", "#ffffff"], // India
  EG: ["#ce1126", "#fefefe", "#000000"], // Egypt
  MX: ["#006847", "#ce1126", "#ffffff"] // Mexico
};

// 🌟 Default shimmer if region missing
const fallback = ["#3399ff", "#66cc66", "#ffffff"];

export function useConfettiTheme(): string[] {
  // Try to get region from session, else from browser, else fallback
  let region: string | undefined;
  try {
    // Try session context if available
    const { org } = useSession();
    region = org?.region;
  } catch {}
  if (!region && typeof navigator !== "undefined") {
    // Try browser region (e.g. en-US => US)
    const parts = navigator.language.split("-");
    region = parts[1]?.toUpperCase();
  }
  // Prefer region palette, else language palette, else fallback
  if (region && palettes[region as keyof typeof palettes]) {
    return palettes[region as keyof typeof palettes];
  }
  // Try language palette
  const lang = (typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en") || "en";
  return getConfettiTheme(lang);
}
