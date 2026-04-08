import fs from "fs";
import path from "path";

export type LocaleEntry = {
  code: string;
  name: string;
};

export type GlobalLocaleCatalog = {
  metadata?: {
    source?: string;
    generatedAt?: string;
  };
  languages: LocaleEntry[];
  regions: LocaleEntry[];
};

const FALLBACK_LANGUAGE_CODES = ["en", "es", "fr", "de", "zh", "ja", "ar", "hi", "pt", "ru"];

const FALLBACK_CATALOG: GlobalLocaleCatalog = {
  languages: FALLBACK_LANGUAGE_CODES.map((code) => ({ code, name: code.toUpperCase() })),
  regions: []
};

let cachedCatalog: GlobalLocaleCatalog | null = null;
let languageSet: Set<string> | null = null;
let regionSet: Set<string> | null = null;
let languageNameMap: Map<string, string> | null = null;
let regionNameMap: Map<string, string> | null = null;

function normalizeLanguageCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.split(/[-_]/)[0].toLowerCase();
}

function normalizeRegionCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/[-_]/);
  const candidate = parts.length > 1 ? parts[1] : parts[0];
  return candidate.toUpperCase();
}

function resolveCatalogPath(): string {
  if (process.env.PULSCO_LOCALE_CATALOG_PATH) {
    return process.env.PULSCO_LOCALE_CATALOG_PATH;
  }

  return path.resolve(
    __dirname,
    "../../../../pulse-connect-ui/src/config/global-locale-catalog.json"
  );
}

function buildIndexes(catalog: GlobalLocaleCatalog) {
  languageSet = new Set(catalog.languages.map((entry) => normalizeLanguageCode(entry.code)));
  regionSet = new Set(catalog.regions.map((entry) => normalizeRegionCode(entry.code)));

  languageNameMap = new Map(
    catalog.languages.map((entry) => [normalizeLanguageCode(entry.code), entry.name])
  );
  regionNameMap = new Map(
    catalog.regions.map((entry) => [normalizeRegionCode(entry.code), entry.name])
  );
}

export function loadGlobalLocaleCatalog(): GlobalLocaleCatalog {
  if (cachedCatalog) {
    return cachedCatalog;
  }

  const catalogPath = resolveCatalogPath();
  try {
    const raw = fs.readFileSync(catalogPath, "utf8");
    const parsed = JSON.parse(raw) as GlobalLocaleCatalog;
    const languages = Array.isArray(parsed.languages) ? parsed.languages : [];
    const regions = Array.isArray(parsed.regions) ? parsed.regions : [];
    cachedCatalog = {
      metadata: parsed.metadata,
      languages,
      regions
    };
  } catch {
    cachedCatalog = FALLBACK_CATALOG;
  }

  buildIndexes(cachedCatalog);
  return cachedCatalog;
}

export function isSupportedLanguage(code: string): boolean {
  if (!languageSet) {
    loadGlobalLocaleCatalog();
  }
  const normalized = normalizeLanguageCode(code);
  return Boolean(normalized && languageSet?.has(normalized));
}

export function isSupportedRegion(code: string): boolean {
  if (!regionSet) {
    loadGlobalLocaleCatalog();
  }
  const normalized = normalizeRegionCode(code);
  return Boolean(normalized && regionSet?.has(normalized));
}

export function findLanguageName(code: string): string | undefined {
  if (!languageNameMap) {
    loadGlobalLocaleCatalog();
  }
  return languageNameMap?.get(normalizeLanguageCode(code));
}

export function findRegionName(code: string): string | undefined {
  if (!regionNameMap) {
    loadGlobalLocaleCatalog();
  }
  return regionNameMap?.get(normalizeRegionCode(code));
}

