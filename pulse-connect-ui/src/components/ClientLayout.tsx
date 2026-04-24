 "use client";

import React, { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { getBrandConfig } from "@/lib/branding";

interface ClientLayoutProps {
  children: React.ReactNode;
  isBrandingFallback?: boolean;
}

export function ClientLayout({ children, isBrandingFallback }: ClientLayoutProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [contentVisible, setContentVisible] = useState(!isBrandingFallback); // Content visible by default if no fallback
  useEffect(() => {
    // Only retry if we started with a fallback and haven't synced yet
    if (isBrandingFallback && !synced) {
      const attemptSync = async () => {
        setIsSyncing(true);
        try {
          const brand = await getBrandConfig(); // Logic detects region via API or default

          if (!brand.isFallback) {
            // Apply tokens directly to the document root to override fallbacks
            const root = document.documentElement;

            Object.entries(brand.colors).forEach(([key, value]) => {
              root.style.setProperty(`--brand-${key}`, value as string);
            });

            Object.entries(brand.surfaces).forEach(([key, value]) => {
              root.style.setProperty(`--brand-surface-${key}`, value as string);
            });

            Object.entries(brand.borders).forEach(([key, value]) => {
              root.style.setProperty(`--brand-border-${key}`, value as string);
            });

            Object.entries(brand.glows).forEach(([key, value]) => {
              root.style.setProperty(`--brand-glow-${key}`, value as string);
            });

            setSynced(true);
            setContentVisible(true); // Make content visible after successful sync
          }
        } catch (e) {
          console.warn("Background branding sync failed. Will retry on next mount.");
        } finally {
          setIsSyncing(false);
        }
      };

      // Wait 2 seconds after mount to retry so we don't block the main thread
      const timer = setTimeout(attemptSync, 2000);
      return () => clearTimeout(timer);
    }
  }, [isBrandingFallback, synced]);

  return (
    <div className="relative flex flex-col min-h-screen">
      {isBrandingFallback && !synced && (
        <div className="sticky top-0 z-[100] w-full bg-warning/10 border-b border-warning/20 backdrop-blur-md px-safe-md py-2 flex items-center justify-center gap-2 text-warning animate-slide-in-up">
          <AlertCircle size={14} className="animate-pulse" />
          <span className="text-caption font-medium tracking-wide uppercase">
            {isSyncing
              ? "Synchronizing Visual Vault..."
              : "Planetary Sync Offline — Using Local Visual Vault"}
          </span>
        </div>
      )}

      <main
        className={`flex-grow w-full max-w-screen-3xl mx-auto px-safe-sm md:px-safe-md transition-opacity duration-1000 ${contentVisible ? "opacity-100" : "opacity-0"}`}
      >
        {children}
      </main>
    </div>
  );
}
