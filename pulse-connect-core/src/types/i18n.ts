export type Locale =
  | "ar" // Arabic
  | "bn" // Bengali
  | "de" // German
  | "en" // English
  | "es" // Spanish
  | "fr" // French
  | "hi" // Hindi
  | "id" // Indonesian
  | "it" // Italian
  | "ja" // Japanese
  | "ko" // Korean
  | "ms" // Malay
  | "nl" // Dutch
  | "pt" // Portuguese
  | "ru" // Russian
  | "th" // Thai
  | "tr" // Turkish
  | "uk" // Ukrainian
  | "vi" // Vietnamese
  | "zh"; // Chinese

export interface LocaleConfig {
  locale: Locale;
  direction: "ltr" | "rtl";
  dateFormat: string;
  timeFormat: string;
  currencyCode: string;
  currencySymbol: string;
}
