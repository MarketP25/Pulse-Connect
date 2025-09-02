import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LANGUAGE_NAMES, RTL_LOCALES } from "@/config/lang";
import { useCallback, useState } from "react";
import { Locale } from "@/types/i18n";
import { ChevronDownIcon, GlobeIcon } from "@heroicons/react/24/outline";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Get current locale from pathname
  const currentLocale = (pathname?.split("/")[1] as Locale) || "en";

  const changeLanguage = useCallback(
    (locale: string) => {
      // Replace the locale segment in the pathname
      const newPathname = pathname?.replace(/^\/[^\/]+/, `/${locale}`);
      router.push(newPathname || `/${locale}`);
      setIsOpen(false);
    },
    [pathname, router]
  );

  // Update document direction when language changes
  const updateDocumentDirection = useCallback((locale: string) => {
    document.documentElement.dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <GlobeIcon className="h-5 w-5" />
        <span>{LANGUAGE_NAMES[currentLocale]}</span>
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {Object.entries(LANGUAGE_NAMES).map(([locale, name]) => (
              <button
                key={locale}
                onClick={() => {
                  changeLanguage(locale);
                  updateDocumentDirection(locale);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700
                  ${currentLocale === locale ? "bg-gray-50 dark:bg-gray-700" : ""}`}
                role="menuitem"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
