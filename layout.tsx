import { getBrandConfig } from "@/lib/branding";
import "@/styles/design-tokens.css";
import "./globals.css";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // In a real scenario, region would be pulled from headers/middleware
  const brand = await getBrandConfig("US-EAST");

  // Map the branding colors to CSS custom properties
  const themeVars = Object.entries(brand.colors)
    .map(([key, value]) => `--brand-${key}: ${value};`)
    .join(" ");

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `:root { ${themeVars} }`
          }}
        />
      </head>
      <body className="bg-[var(--brand-bg)] text-[var(--brand-text)] min-h-screen">{children}</body>
    </html>
  );
}
