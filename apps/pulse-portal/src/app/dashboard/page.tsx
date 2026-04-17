"use client";

import { usePulsePortal } from "../pulse-portal-provider";

export default function DashboardPage() {
  const { isAuthenticated, user } = usePulsePortal();

  if (!isAuthenticated) {
    return <div>Loading...</div>; // Middleware handles redirect
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-4xl font-bold text-white">Dashboard - Protected Feature</h1>
      <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
        <h2 className="text-2xl font-semibold text-white mb-4">Welcome back, {user?.name}!</h2>
        <p className="text-slate-300">
          This is a protected feature. To access full system,go to the signup page to signup/register.
        </p>
        <p className="text-sm text-slate-400 mt-2">User ID: {user?.id} | Authenticated: Yes</p>
      </div>
    </div>
  );
}
