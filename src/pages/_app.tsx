import { useState, useEffect } from "react";
import type { AppProps } from "next/app";

import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import RealtimeBanner from "@/components/RealtimeBanner";
import UpgradePrompt from "@/components/UpgradePrompt";
import "@/styles/globals.css";

// Context Providers
import { SessionProvider } from "@/context/SessionProvider";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { RoleProvider } from "@/context/RoleContext";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(id);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <SessionProvider>
      <RealtimeProvider>
        <RoleProvider>
          <Header />
          <RealtimeBanner />
          <UpgradePrompt />
          <Component {...pageProps} />
        </RoleProvider>
      </RealtimeProvider>
    </SessionProvider>
  );
}