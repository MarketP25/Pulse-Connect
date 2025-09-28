import { useState, useEffect } from "react";
import type { AppProps } from "next/app";
import { IntlProvider as NextIntlProvider } from "next-intl";

import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import RealtimeBanner from "@/components/RealtimeBanner";
import UpgradePrompt from "@/components/UpgradePrompt";
import "@/styles/globals.css";

import { SessionProvider } from "@/context/SessionProvider";
import { RealtimeProvider } from "@/context/RealtimeContext";
import { RoleProvider } from "@/context/RoleContext";
import { LanguageProvider } from "@/context/LanguageProvider";

type PageProps = {
  locale: string;
  messages: Record<string, string>;
  // plus any other props your pages return
};

type MyAppProps = AppProps<PageProps>;

export default function MyApp({ Component, pageProps }: MyAppProps) {
  const { locale, messages, ...restProps } = pageProps;
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(id);
  }, []);

  if (showSplash) return <SplashScreen />;

  return (
    <NextIntlProvider locale={locale} messages={messages}>
      <LanguageProvider>
        <SessionProvider>
          <RealtimeProvider>
            <RoleProvider>
              <Header />
              <RealtimeBanner />
              <UpgradePrompt />
              {/* Pass down only the rest of your props */}
              <Component {...(restProps as any)} />
            </RoleProvider>
          </RealtimeProvider>
        </SessionProvider>
      </LanguageProvider>
    </NextIntlProvider>
  );
}
