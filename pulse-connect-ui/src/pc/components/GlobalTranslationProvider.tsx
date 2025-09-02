import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Locale } from "@/types/i18n";
import { LOCALE_REGION_MAPPING, RTL_LOCALES } from "@/config/lang";
import { TranslationService } from "@/lib/services/translationService";

interface GlobalTranslationProviderProps {
  children: ReactNode;
  defaultLocale?: Locale;
}

const translationService = new TranslationService();

export function GlobalTranslationProvider({
  children,
  defaultLocale = "en"
}: GlobalTranslationProviderProps) {
  const pathname = usePathname();
  const currentLocale = (pathname?.split("/")[1] as Locale) || defaultLocale;

  useEffect(() => {
    // Set document direction based on locale
    document.documentElement.dir = RTL_LOCALES.has(currentLocale) ? "rtl" : "ltr";

    // Set language attribute
    document.documentElement.lang = currentLocale;

    // Set date and number formatting
    document.documentElement.setAttribute("data-locale", LOCALE_REGION_MAPPING[currentLocale]);
  }, [currentLocale]);

  return (
    <div className={`root-wrapper ${RTL_LOCALES.has(currentLocale) ? "rtl" : "ltr"}`}>
      {children}
    </div>
  );
}
