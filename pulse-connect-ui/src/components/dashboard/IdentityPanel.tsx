"use client";

import { DashboardIdentityModule, DashboardUser } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  user: DashboardUser;
  identity?: DashboardIdentityModule;
  loading: boolean;
  onEnableTwoFactor: () => Promise<void>;
};

export function IdentityPanel({ title, user, identity, loading, onEnableTwoFactor }: Props) {
  return (
    <SectionCard
      title={title}
      subtitle="Identity lifecycle, 2FA posture, session visibility, and account history."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Account Security</p>
          <article className="rounded-lg border border-slate-200 p-3">
            <p>Status: {identity?.accountStatus || "active"}</p>
            <p>Email verified: {user.emailVerified ? "Yes" : "No"}</p>
            <p>Phone verified: {user.phoneVerified ? "Yes" : "No"}</p>
            <p>2FA enabled: {identity?.twoFactorEnabled ? "Yes" : "No"}</p>
          </article>
          {!identity?.twoFactorEnabled ? (
            <button
              className="rounded bg-pulse-cyan-500 px-3 py-1.5 text-xs font-semibold text-orbit-blue-700 hover:bg-pulse-cyan-400 disabled:opacity-60"
              onClick={() => onEnableTwoFactor()}
              disabled={loading}
            >
              Enable 2FA
            </button>
          ) : null}
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="font-semibold text-slate-900">Required actions</p>
            <p>{identity?.onboardingRequiredActions?.join(", ") || "None"}</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Sessions</p>
          {(identity?.sessions || []).map((session) => (
            <article key={session.id} className="rounded-lg border border-slate-200 p-2">
              <p>{session.device}</p>
              <p className="text-xs text-slate-500">
                {session.ipMasked} | Last seen: {new Date(session.lastSeenAt).toLocaleString()}
              </p>
            </article>
          ))}
          <p className="mt-2 font-semibold text-slate-900">History</p>
          {(identity?.history || []).slice(0, 6).map((entry) => (
            <article key={entry.id} className="rounded-lg border border-slate-200 p-2">
              <p>{entry.action}</p>
              <p className="text-xs text-slate-500">
                {entry.actor} | {new Date(entry.at).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
