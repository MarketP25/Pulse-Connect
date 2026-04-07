import globalLocaleCatalog from "./global-locale-catalog.json";

export const DEFAULT_LOCALE_REGION_MAPPING = {
  en: "US",
  fr: "FR",
  sw: "KE",
  es: "ES",
  de: "DE",
  zh: "CN"
} as const;

export const LOCALE_REGION_MAPPING = DEFAULT_LOCALE_REGION_MAPPING;

export type Locale = string;

export type LocaleEntry = {
  code: string;
  name: string;
};

export const GLOBAL_LANGUAGE_CATALOG: LocaleEntry[] =
  (globalLocaleCatalog as { languages: LocaleEntry[] }).languages || [];

export const GLOBAL_REGION_CATALOG: LocaleEntry[] =
  (globalLocaleCatalog as { regions: LocaleEntry[] }).regions || [];

export function findLanguageName(code: string): string | undefined {
  return GLOBAL_LANGUAGE_CATALOG.find((item) => item.code === code)?.name;
}

export function findRegionName(code: string): string | undefined {
  return GLOBAL_REGION_CATALOG.find((item) => item.code === code)?.name;
}

export function isSupportedLanguage(code: string): boolean {
  return GLOBAL_LANGUAGE_CATALOG.some((item) => item.code === code);
}

export function isSupportedRegion(code: string): boolean {
  return GLOBAL_REGION_CATALOG.some((item) => item.code === code);
}

export function getDefaultRegionForLanguage(code: string): string | undefined {
  return LOCALE_REGION_MAPPING[code as keyof typeof LOCALE_REGION_MAPPING];
}
