export type BrandTone = "formal" | "neutral" | "friendly";

export interface BrandConfig {
  region: string;
  isFallback: boolean;
  localeConfig: {
    locale: string;
    tone: BrandTone;
  };
  colors: Record<string, string>;
  surfaces: Record<string, string>;
  borders: Record<string, string>;
  glows: Record<string, string>;
  assets: {
    manifest?: string;
    logo?: string;
    favicon?: string;
  };
}

const DEFAULT_BRAND: BrandConfig = {
  region: "GLOBAL-MASTER-DEFAULT",
  isFallback: false,
  localeConfig: {
    locale: "en-US",
    tone: "neutral"
  },
  colors: {
    primary: "#0ea5e9",
    secondary: "#2563eb",
    accent: "#0ea5a4",
    text: "#0f172a",
    background: "#f8fafc"
  },
  surfaces: {
    low: "#e2e8f0",
    mid: "#cbd5e1",
    high: "#ffffff"
  },
  borders: {
    low: "#cbd5e1",
    high: "#94a3b8"
  },
  glows: {
    low: "rgba(14, 165, 233, 0.25)",
    high: "rgba(37, 99, 235, 0.35)"
  },
  assets: {
    manifest: "/manifest.webmanifest",
    logo: "/icons/icon-192x192.jpeg",
    favicon: "/favicon.ico"
  }
};

export async function getBrandConfig(region = "GLOBAL-MASTER-DEFAULT"): Promise<BrandConfig> {
  return {
    ...DEFAULT_BRAND,
    region
  };
}

