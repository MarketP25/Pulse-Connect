"use client";

import { useState } from "react";
import { DashboardRole, SupportedDashboardLanguage, DashboardUser } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  saveLabel: string;
  user: DashboardUser;
  onSave: (payload: { role?: DashboardRole; preferredLanguage?: SupportedDashboardLanguage; referralCode?: string }) => Promise<void>;
  loading: boolean;
};

const roles: DashboardRole[] = ["individual", "business", "creator", "partner", "developer", "enterprise", "government"];
const languages: SupportedDashboardLanguage[] = ["en", "sw", "fr", "es"];

export function OnboardingPanel({ title, saveLabel, user, onSave, loading }: Props) {
  const [role, setRole] = useState<DashboardRole>(user.role);
  const [language, setLanguage] = useState<SupportedDashboardLanguage>(user.preferredLanguage);
  const [referralCode, setReferralCode] = useState(user.referredByCode || "");

  return (
    <SectionCard title={title} subtitle="Role selection, language translation, and referral validation.">
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
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={language}
            onChange={(event) => setLanguage(event.target.value as SupportedDashboardLanguage)}
          >
            {languages.map((item) => (
              <option key={item} value={item}>
                {item.toUpperCase()}
              </option>
            ))}
          </select>
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
          onClick={() => onSave({ role, preferredLanguage: language, referralCode: referralCode || undefined })}
          disabled={loading}
        >
          {loading ? "Saving..." : saveLabel}
        </button>
      </div>
    </SectionCard>
  );
}
