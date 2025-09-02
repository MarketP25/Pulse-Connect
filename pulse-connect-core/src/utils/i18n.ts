import type { LocalizedString, Locale } from "@/types/plan";

/**
 * Returns the string in the current locale, falling back to English.
 */
export function getLocalizedValue(obj: LocalizedString, locale: Locale): string {
  return obj[locale] ?? obj["en"];
}
