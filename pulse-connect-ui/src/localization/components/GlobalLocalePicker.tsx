"use client";

import { useMemo, useState } from "react";
import {
  GLOBAL_LANGUAGE_CATALOG,
  GLOBAL_REGION_CATALOG,
  findLanguageName,
  findRegionName
} from "@/config/lang";

type GlobalLocalePickerProps = {
  language: string;
  region: string;
  onLanguageChange: (language: string) => void;
  onRegionChange: (region: string) => void;
  className?: string;
};

export function GlobalLocalePicker({
  language,
  region,
  onLanguageChange,
  onRegionChange,
  className = ""
}: GlobalLocalePickerProps) {
  const [languageSearch, setLanguageSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");

  const filteredLanguages = useMemo(() => {
    const search = languageSearch.trim().toLowerCase();
    const candidates = GLOBAL_LANGUAGE_CATALOG.filter((entry) => {
      if (!search) return true;
      return entry.code.toLowerCase().includes(search) || entry.name.toLowerCase().includes(search);
    });

    return candidates;
  }, [languageSearch]);

  const filteredRegions = useMemo(() => {
    const search = regionSearch.trim().toLowerCase();
    const candidates = GLOBAL_REGION_CATALOG.filter((entry) => {
      if (!search) return true;
      return entry.code.toLowerCase().includes(search) || entry.name.toLowerCase().includes(search);
    });

    return candidates;
  }, [regionSearch]);

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Language</label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={languageSearch}
          onChange={(event) => setLanguageSearch(event.target.value)}
          placeholder="Search language by name or code..."
          aria-label="Search language"
        />
        <select
          className="w-full h-40 rounded-md border border-slate-300 px-2 py-1 text-sm overflow-y-auto"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
          size={8}
          aria-label="Choose language"
        >
          {filteredLanguages.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name} ({entry.code})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        <label className="block text-sm font-medium">Region / Country</label>
        <input
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={regionSearch}
          onChange={(event) => setRegionSearch(event.target.value)}
          placeholder="Search country/region by name or code..."
          aria-label="Search region"
        />
        <select
          className="w-full h-40 rounded-md border border-slate-300 px-2 py-1 text-sm overflow-y-auto"
          value={region}
          onChange={(event) => onRegionChange(event.target.value)}
          size={8}
          aria-label="Choose country or region"
        >
          {filteredRegions.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.name} ({entry.code})
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 text-xs text-slate-500">
        {language && (
          <p>
            Selected language: {findLanguageName(language) ?? "Unknown"} ({language})
          </p>
        )}
        {region && (
          <p>
            Selected region: {findRegionName(region) ?? "Unknown"} ({region})
          </p>
        )}
      </div>
    </div>
  );
}
