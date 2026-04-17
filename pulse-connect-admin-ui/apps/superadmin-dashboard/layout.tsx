import React from "react";
import Navigation from "@pulsco/ui-components/Navigation";
import { RiskIndicator } from "@/components/RiskIndicator";
import "@/styles/design-tokens.css";
import "./globals.css";

export const metadata = {
  title: "PULSCO Planetary Portal",
  description: "Unified Intelligent Digital Ecosystem"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // In a production scenario, these are derived from environment variables or CSI signals
  const currentEnv = "sandbox";
  const csiRiskScore = 0.12;

  return (
    <html lang="en">
      <body className="bg-nebula-dark text-tech-white min-h-screen flex flex-col">
        <Navigation title="PULSCO Portal" environment={currentEnv} sticky>
          <div className="flex items-center gap-6">
            <RiskIndicator score={csiRiskScore} label="Global Trust" />
            <div className="w-8 h-8 rounded-full bg-cosmic-slate border border-pulse-cyan-accent shadow-glow-cyan" />
          </div>
        </Navigation>
        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-[var(--container-2xl)] mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
