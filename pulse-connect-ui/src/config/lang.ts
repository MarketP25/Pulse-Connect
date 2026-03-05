export const LOCALE_REGION_MAPPING = {
  en: "US",
  fr: "FR",
  sw: "KE",
  es: "ES",
  de: "DE",
  zh: "CN",
} as const;

export type Locale = keyof typeof LOCALE_REGION_MAPPING;
