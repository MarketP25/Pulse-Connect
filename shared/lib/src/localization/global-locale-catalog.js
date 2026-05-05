"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalLocaleCatalog = loadGlobalLocaleCatalog;
exports.isSupportedLanguage = isSupportedLanguage;
exports.isSupportedRegion = isSupportedRegion;
exports.findLanguageName = findLanguageName;
exports.findRegionName = findRegionName;
const fs_1 = require("fs");
const path_1 = require("path");
const FALLBACK_LANGUAGE_CODES = ["en", "es", "fr", "de", "zh", "ja", "ar", "hi", "pt", "ru"];
const FALLBACK_CATALOG = {
    languages: FALLBACK_LANGUAGE_CODES.map((code) => ({ code, name: code.toUpperCase() })),
    regions: []
};
let cachedCatalog = null;
let languageSet = null;
let regionSet = null;
let languageNameMap = null;
let regionNameMap = null;
function normalizeLanguageCode(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return "";
    return trimmed.split(/[-_]/)[0].toLowerCase();
}
function normalizeRegionCode(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return "";
    const parts = trimmed.split(/[-_]/);
    const candidate = parts.length > 1 ? parts[1] : parts[0];
    return candidate.toUpperCase();
}
function resolveCatalogPath() {
    if (process.env.PULSCO_LOCALE_CATALOG_PATH) {
        return process.env.PULSCO_LOCALE_CATALOG_PATH;
    }
    return path_1.default.resolve(__dirname, "../../../../pulse-connect-ui/src/config/global-locale-catalog.json");
}
function buildIndexes(catalog) {
    languageSet = new Set(catalog.languages.map((entry) => normalizeLanguageCode(entry.code)));
    regionSet = new Set(catalog.regions.map((entry) => normalizeRegionCode(entry.code)));
    languageNameMap = new Map(catalog.languages.map((entry) => [normalizeLanguageCode(entry.code), entry.name]));
    regionNameMap = new Map(catalog.regions.map((entry) => [normalizeRegionCode(entry.code), entry.name]));
}
function loadGlobalLocaleCatalog() {
    if (cachedCatalog) {
        return cachedCatalog;
    }
    const catalogPath = resolveCatalogPath();
    try {
        const raw = fs_1.default.readFileSync(catalogPath, "utf8");
        const parsed = JSON.parse(raw);
        const languages = Array.isArray(parsed.languages) ? parsed.languages : [];
        const regions = Array.isArray(parsed.regions) ? parsed.regions : [];
        cachedCatalog = {
            metadata: parsed.metadata,
            languages,
            regions
        };
    }
    catch {
        cachedCatalog = FALLBACK_CATALOG;
    }
    buildIndexes(cachedCatalog);
    return cachedCatalog;
}
function isSupportedLanguage(code) {
    if (!languageSet) {
        loadGlobalLocaleCatalog();
    }
    const normalized = normalizeLanguageCode(code);
    return Boolean(normalized && languageSet?.has(normalized));
}
function isSupportedRegion(code) {
    if (!regionSet) {
        loadGlobalLocaleCatalog();
    }
    const normalized = normalizeRegionCode(code);
    return Boolean(normalized && regionSet?.has(normalized));
}
function findLanguageName(code) {
    if (!languageNameMap) {
        loadGlobalLocaleCatalog();
    }
    return languageNameMap?.get(normalizeLanguageCode(code));
}
function findRegionName(code) {
    if (!regionNameMap) {
        loadGlobalLocaleCatalog();
    }
    return regionNameMap?.get(normalizeRegionCode(code));
}
//# sourceMappingURL=global-locale-catalog.js.map