import { useSession } from "@/hooks/useSession";

// 🎨 Region-tuned palettes
const palettes: Record<
  "KE" | "NG" | "BR" | "IN" | "EG" | "MX",
  string[]
> = {
  KE: ["#fcbc05", "#008751", "#ffffff"],         // Kenya
  NG: ["#008751", "#fecd1a", "#ffffff"],          // Nigeria
  BR: ["#009c3b", "#ffdf00", "#002776"],          // Brazil
  IN: ["#ff9933", "#138808", "#ffffff"],          // India
  EG: ["#ce1126", "#fefefe", "#000000"],          // Egypt
  MX: ["#006847", "#ce1126", "#ffffff"]           // Mexico
};

// 🌟 Default shimmer if region missing
const fallback = ["#3399ff", "#66cc66", "#ffffff"];

export function useConfettiTheme(): string[] {
  const { org } = useSession();
  return palettes[org.region as keyof typeof palettes] ?? fallback;
}