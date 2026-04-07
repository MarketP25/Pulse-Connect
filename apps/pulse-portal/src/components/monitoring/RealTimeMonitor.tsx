"use client";

import { useEffect, useState } from "react";

export function RealTimeMonitor() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Real-Time Monitor</h2>
          <p className="text-slate-300">
            Connectivity and UX telemetry only. Financial/admin/auth routes remain network-only.
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isOnline
              ? "bg-green-600/20 text-green-200 border border-green-500/30"
              : "bg-red-600/20 text-red-200 border border-red-500/30"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
            <div className="text-sm text-slate-400">Mode</div>
            <div className="text-white font-semibold">Network-only</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
            <div className="text-sm text-slate-400">Asset Cache</div>
            <div className="text-white font-semibold">Allowlisted (SWR)</div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/30 p-4">
            <div className="text-sm text-slate-400">Telemetry</div>
            <div className="text-white font-semibold">Buffered (IndexedDB)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealTimeMonitor;
