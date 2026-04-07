"use client";

import { LanguageProvider } from "@/lib/localization/language-provider";
import { I18nProvider } from "@/lib/localization/i18n-provider";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <LanguageProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </LanguageProvider>
  );
}</content>
<parameter name="filePath">c:\Users\user\PULSCO\pulse-connect-ui\src\components\ClientLayout.tsx