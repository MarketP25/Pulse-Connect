export type DashboardLanguageOption = {
  code: string;
  label: string;
  region: string;
};

export const DASHBOARD_LANGUAGE_OPTIONS: DashboardLanguageOption[] = [
  { code: "en", label: "English", region: "Global" },
  { code: "sw", label: "Kiswahili", region: "Africa" },
  { code: "fr", label: "Francais", region: "Europe/Africa" },
  { code: "es", label: "Espanol", region: "Americas/Europe" },
  { code: "de", label: "Deutsch", region: "Europe" },
  { code: "pt", label: "Portugues", region: "Europe/Americas" },
  { code: "ar", label: "Arabic", region: "Middle East/Africa" },
  { code: "zh", label: "Chinese", region: "Asia" },
  { code: "ja", label: "Japanese", region: "Asia" },
  { code: "ko", label: "Korean", region: "Asia" }
];

export const DASHBOARD_LANGUAGE_CODES = DASHBOARD_LANGUAGE_OPTIONS.map((item) => item.code);

export function isSupportedDashboardLanguage(language: string | undefined | null): boolean {
  if (!language) return false;
  const normalized = language.trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(normalized);
}

export function normalizeDashboardLanguage(
  language: string | undefined | null,
  fallback = "en"
): string {
  const normalized = (language || "").trim().toLowerCase();
  if (isSupportedDashboardLanguage(normalized)) {
    return normalized;
  }
  return fallback;
}
