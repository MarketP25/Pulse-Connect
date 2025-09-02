export const SUPPORTED_LOCALES = ["en", "ko", "fr", "es", "de", "zh", "ja", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  zh: "中文",
  ja: "日本語",
  ar: "العربية"
};

export const LOCALE_COUNTRIES: Record<Locale, string> = {
  en: "us",
  ko: "kr",
  fr: "fr",
  es: "es",
  de: "de",
  zh: "cn",
  ja: "jp",
  ar: "sa"
};

// RTL languages
export const RTL_LOCALES = new Set(["ar"]);

// Date and number formats for each locale
export const LOCALE_FORMATS: Record<
  Locale,
  {
    date: Intl.DateTimeFormatOptions;
    number: Intl.NumberFormatOptions;
    currency: Intl.NumberFormatOptions;
  }
> = {
  en: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "USD" }
  },
  ko: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "KRW" }
  },
  fr: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "EUR" }
  },
  es: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "EUR" }
  },
  de: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "EUR" }
  },
  zh: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "CNY" }
  },
  ja: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "JPY" }
  },
  ar: {
    date: { day: "numeric", month: "long", year: "numeric" },
    number: { style: "decimal" },
    currency: { style: "currency", currency: "SAR" }
  }
};
