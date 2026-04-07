"use client";

import { useMemo, useState } from "react";
import { DashboardUser } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  saveLabel: string;
  user: DashboardUser;
  onSave: (payload: { displayName?: string; country?: string; city?: string }) => Promise<void>;
  loading: boolean;
};

export function ProfilePanel({ title, saveLabel, user, onSave, loading }: Props) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [country, setCountry] = useState(user.country);
  const [city, setCity] = useState(user.city);

  const kycLabel = useMemo(() => {
    if (user.kycStatus === "verified") {
      return "Full KYC verified";
    }
    if (user.kycStatus === "pending") {
      return "KYC pending";
    }
    return "KYC not required";
  }, [user.kycStatus]);

  return (
    <SectionCard
      title={title}
      subtitle="Manage profile details, role context, and personalization settings."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Display Name</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Email (masked)</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-slate-100"
            value={user.emailMasked}
            readOnly
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">Country</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-600">City</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
        <span>Tier: {user.tier}</span>
        <span>Role: {user.role}</span>
        <span>{kycLabel}</span>
      </div>

      <div className="mt-4">
        <button
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          onClick={() => onSave({ displayName, country, city })}
          disabled={loading}
        >
          {loading ? "Saving..." : saveLabel}
        </button>
      </div>
    </SectionCard>
  );
}
