"use client";

import { DASHBOARD_LANGUAGE_OPTIONS } from "@/lib/localization/languages";

type Props = {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
  className?: string;
};

export function LanguageSelect({ value, onChange, disabled = false, className = "" }: Props) {
  return (
    <select
      className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm ${className}`.trim()}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label="Preferred language"
    >
      {DASHBOARD_LANGUAGE_OPTIONS.map((option) => (
        <option key={option.code} value={option.code}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
