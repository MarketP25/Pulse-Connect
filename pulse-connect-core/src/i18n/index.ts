import { Locale } from "@/types/i18n";

// Language display names in their native form
export const LANGUAGE_NAMES: Record<Locale, string> = {
  ar: "العربية", // Arabic
  bn: "বাংলা", // Bengali
  de: "Deutsch", // German
  en: "English", // English
  es: "Español", // Spanish
  fr: "Français", // French
  hi: "हिन्दी", // Hindi
  id: "Bahasa Indonesia", // Indonesian
  it: "Italiano", // Italian
  ja: "日本語", // Japanese
  ko: "한국어", // Korean
  ms: "Bahasa Melayu", // Malay
  nl: "Nederlands", // Dutch
  pt: "Português", // Portuguese
  ru: "Русский", // Russian
  th: "ไทย", // Thai
  tr: "Türkçe", // Turkish
  uk: "Українська", // Ukrainian
  vi: "Tiếng Việt", // Vietnamese
  zh: "中文" // Chinese
};

// RTL (Right-to-Left) languages
export const RTL_LOCALES = new Set(["ar"]);

// Language regions for date, number, and currency formatting
export const LOCALE_REGION_MAPPING: Record<Locale, string> = {
  ar: "ar-SA", // Arabic (Saudi Arabia)
  bn: "bn-IN", // Bengali (India)
  de: "de-DE", // German (Germany)
  en: "en-US", // English (United States)
  es: "es-ES", // Spanish (Spain)
  fr: "fr-FR", // French (France)
  hi: "hi-IN", // Hindi (India)
  id: "id-ID", // Indonesian (Indonesia)
  it: "it-IT", // Italian (Italy)
  ja: "ja-JP", // Japanese (Japan)
  ko: "ko-KR", // Korean (South Korea)
  ms: "ms-MY", // Malay (Malaysia)
  nl: "nl-NL", // Dutch (Netherlands)
  pt: "pt-BR", // Portuguese (Brazil)
  ru: "ru-RU", // Russian (Russia)
  th: "th-TH", // Thai (Thailand)
  tr: "tr-TR", // Turkish (Turkey)
  uk: "uk-UA", // Ukrainian (Ukraine)
  vi: "vi-VN", // Vietnamese (Vietnam)
  zh: "zh-CN" // Chinese (China)
};

// Time zones commonly associated with each locale
export const DEFAULT_TIMEZONES: Record<Locale, string> = {
  ar: "Asia/Riyadh",
  bn: "Asia/Kolkata",
  de: "Europe/Berlin",
  en: "America/New_York",
  es: "Europe/Madrid",
  fr: "Europe/Paris",
  hi: "Asia/Kolkata",
  id: "Asia/Jakarta",
  it: "Europe/Rome",
  ja: "Asia/Tokyo",
  ko: "Asia/Seoul",
  ms: "Asia/Kuala_Lumpur",
  nl: "Europe/Amsterdam",
  pt: "America/Sao_Paulo",
  ru: "Europe/Moscow",
  th: "Asia/Bangkok",
  tr: "Europe/Istanbul",
  uk: "Europe/Kiev",
  vi: "Asia/Ho_Chi_Minh",
  zh: "Asia/Shanghai"
};
