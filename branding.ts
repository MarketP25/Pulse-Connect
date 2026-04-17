/**
 * Branding Service Client
 * Fetches dynamic configuration from the Edge Gateway for automated theme switching.
 */

export interface BrandConfig {
  colors: Record<string, string>;
  surfaces: Record<string, string>;
  borders: Record<string, string>;
  assets: {
    logo: string;
    favicon: string;
    manifest: string;
  };
  glows: {
    low: string;
    mid: string;
    high: string;
  };
  localeConfig: {
    locale: string;
    tone: "formal" | "friendly" | "minimalist";
  };
  isFallback?: boolean;
}

const DEFAULT_BRAND: BrandConfig = {
  colors: {
    primary: "#1940CD",
    secondary: "#9D00FF",
    background: "#0A1428",
    text: "#F0F4F8",
    accent: "#00D9FF"
  },
  surfaces: {
    low: "#1A2744",
    md: "#252E43",
    high: "#303852"
  },
  borders: {
    subtle: "#3A4A6A",
    bold: "#00D9FF4D"
  },
  assets: {
    logo: "/icons/icon-192x192.jpeg",
    favicon: "/favicon.ico",
    manifest: "/manifest.webmanifest"
  },
  glows: {
    low: "#1940CD1A",
    mid: "#1940CD33",
    high: "#1940CD4D"
  },
  localeConfig: {
    locale: "en-US",
    tone: "formal"
  },
  isFallback: true
};

export async function getBrandConfig(region: string = "global"): Promise<BrandConfig> {
  // Use NEXT_PUBLIC for client-side accessibility, fallback to server-side env
  const edgeUrl =
    process.env.NEXT_PUBLIC_EDGE_GATEWAY_URL ||
    process.env.EDGE_GATEWAY_URL ||
    "https://edge.pulsco.global";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(`${edgeUrl}/edge/brand/config?regionCode=${region}`, {
      next: { revalidate: 3600 },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Branding synchronization failed");
    const data = await response.json();

    return {
      ...data,
      surfaces: data.surfaces || {
        low: `${data.colors.background}E6`,
        md: `${data.colors.background}CC`,
        high: `${data.colors.background}B3`
      },
      borders: data.borders || {
        subtle: `${data.colors.text}1A`,
        bold: `${data.colors.primary}4D`
      },
      glows: {
        low: `${data.colors.primary}1A`,
        mid: `${data.colors.primary}33`,
        high: `${data.colors.primary}4D`
      },
      // Use the localeConfig provided by the dynamic catalog,
      // falling back to safe generic globals if the specific region is still onboarding.
      localeConfig: data.localeConfig || DEFAULT_BRAND.localeConfig,
      isFallback: false
    };
  } catch (error) {
    console.error("Critical: Branding sync timed out or failed. Using planetary defaults.", error);
    return DEFAULT_BRAND;
  }
}
