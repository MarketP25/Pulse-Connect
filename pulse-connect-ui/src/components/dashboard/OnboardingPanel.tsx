"use client";

import { useMemo, useState } from "react";
import { DashboardRole, SupportedDashboardLanguage, DashboardUser } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";
import { DASHBOARD_LANGUAGE_CODES } from "@/lib/localization/languages";

type LanguageCoverage = {
  language: string;
  regions: string[];
  quality: "high" | "medium" | "low";
};

type Props = {
  title: string;
  saveLabel: string;
  user: DashboardUser;
  languageCoverage?: LanguageCoverage[];
  onSave: (payload: {
    role?: DashboardRole;
    preferredLanguage?: SupportedDashboardLanguage;
    referralCode?: string;
  }) => Promise<void>;
  loading: boolean;
};

const roles: DashboardRole[] = [
  "individual",
  "business",
  "admin",
  "organisation",
  "investor",
  "partner"
];

function normalizeLanguageCode(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (!/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(normalized)) return null;
  return normalized;
}

export function OnboardingPanel({
  title,
  saveLabel,
  user,
  languageCoverage,
  onSave,
  loading
}: Props) {
  const [role, setRole] = useState<DashboardRole>(user.role);
  const [language, setLanguage] = useState<SupportedDashboardLanguage>(user.preferredLanguage);
  const [referralCode, setReferralCode] = useState(user.referredByCode || "");

  const languageSuggestions = useMemo(() => {
    const fromCoverage = (languageCoverage || [])
      .map((item) => normalizeLanguageCode(String(item.language || "")))
      .filter(Boolean);
    const merged = new Set<string>([
      ...DASHBOARD_LANGUAGE_CODES,
      ...fromCoverage,
      ...(normalizeLanguageCode(user.preferredLanguage)
        ? [normalizeLanguageCode(user.preferredLanguage)!]
        : [])
    ]);
    return Array.from(merged).sort((a, b) => a.localeCompare(b));
  }, [languageCoverage, user.preferredLanguage]);

  return (
    <SectionCard
      title={title}
      subtitle="Role selection, language translation, and referral validation."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Role</span>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={role}
            onChange={(event) => setRole(event.target.value as DashboardRole)}
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Language</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            list="dashboard-language-suggestions"
            value={language}
            onChange={(event) => {
              const next = normalizeLanguageCode(event.target.value);
              setLanguage(
                (next || event.target.value.trim().toLowerCase()) as SupportedDashboardLanguage
              );
            }}
            placeholder="e.g. en, sw, es, yue, qu, ase"
          />
          <datalist id="dashboard-language-suggestions">
            {languageSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <p className="text-xs text-slate-500">
            Internal localization + CSI coverage. Any valid ISO language code is accepted.
          </p>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Referral Code</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={referralCode}
            onChange={(event) => setReferralCode(event.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Your referral code: {user.referralCode}</span>
        <span>Credits: {user.referralCredits}</span>
      </div>

      <div className="mt-4">
        <button
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          onClick={() =>
            onSave({ role, preferredLanguage: language, referralCode: referralCode || undefined })
          }
          disabled={loading}
        >
          {loading ? "Saving..." : saveLabel}
        </button>
      </div>
    </SectionCard>
  );
}
