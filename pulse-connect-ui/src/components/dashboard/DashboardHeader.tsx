"use client";

import { DashboardUser } from "@/types/dashboard";

type Props = {
  title: string;
  subtitle: string;
  user: DashboardUser;
  currentUserId: string;
  onUserIdChange: (id: string) => void;
};

const demoUsers = [
  { id: "demo-basic", label: "Basic Demo" },
  { id: "demo-premium", label: "Premium Demo" },
  { id: "demo-enterprise", label: "Enterprise Demo" }
];

export function DashboardHeader({ title, subtitle, user, currentUserId, onUserIdChange }: Props) {
  return (
    <header className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          <p className="mt-2 text-xs text-slate-500">
            User: {user.displayName} | Tier: {user.tier} | Role: {user.role}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          Demo user
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={currentUserId}
            onChange={(event) => onUserIdChange(event.target.value)}
          >
            {demoUsers.map((demo) => (
              <option key={demo.id} value={demo.id}>
                {demo.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
