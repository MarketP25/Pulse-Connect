import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../../../styles/design-tokens.css";
import { PwaRegister } from "@pulsco/pwa";
import { ClientLayout } from "@/components/ClientLayout";
import { getBrandConfig } from "@/lib/branding";
import { I18nProvider } from "@/components/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "PULSCO Universal Dashboard",
  description:
    "Global, CSI-governed user dashboard for localization-aware operations, billing, matchmaking, and platform intelligence."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read the region set by our middleware
  const headerList = await headers();
  const region = headerList.get("x-pulsco-region") || "GLOBAL-MASTER-DEFAULT";

  // Fetch dynamic branding tokens for this specific region
  // This happens server-side, preventing FOUC (Flash of Unbranded Content)
  const brand = await getBrandConfig(region);

  // Convert brand colors to CSS variables and generate glow variations
  const themeVars = Object.entries(brand.colors)
    .map(([key, value]) => `--brand-${key}: ${value};`)
    .join(" ");

  const surfaceVars = Object.entries(brand.surfaces)
    .map(([key, value]) => `--brand-surface-${key}: ${value};`)
    .join(" ");

  const borderVars = Object.entries(brand.borders)
    .map(([key, value]) => `--brand-border-${key}: ${value};`)
    .join(" ");

  const glowVars = Object.entries(brand.glows)
    .map(([key, value]) => `--brand-glow-${key}: ${value};`)
    .join(" ");

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeVars} ${surfaceVars} ${borderVars} ${glowVars} }`
          }}
        />
        <meta name="theme-color" content="#0A1428" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href={brand.assets.manifest || "/manifest.webmanifest"} />
        <link rel="apple-touch-icon" href={brand.assets.logo || "/icons/icon-192x192.jpeg"} />
        <link rel="icon" href={brand.assets.favicon || "/favicon.ico"} sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-16x16.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-brand-background text-brand-text antialiased transition-colors duration-500 font-sans`}
      >
        <PwaRegister appId="@pulsco/pulse-connect-ui" />
        <I18nProvider config={brand.localeConfig}>
          <ClientLayout isBrandingFallback={brand.isFallback}>{children}</ClientLayout>
        </I18nProvider>
      </body>
    </html>
  );
}
