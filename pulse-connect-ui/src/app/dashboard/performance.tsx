"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { verifyAccess } from "@/middleware/verifyCode";

type PerformanceLog = {
  timestamp: string;
  actor: string;
  action: string;
  listingId: string;
  notes?: string;
  success?: boolean;
};

export default function PerformanceDashboard() {
  const t = useTranslations();
  const accessGranted = verifyAccess(process.env.NEXT_PUBLIC_VERIFICATION_CODE || "");

  const [logs, setLogs] = useState<PerformanceLog[]>([]);

  useEffect(() => {
    if (accessGranted) {
      fetch("/api/performance")
        .then(res => res.json())
        .then((data: { logs: PerformanceLog[] }) => setLogs(data.logs));
    }
  }, [accessGranted]);

  if (!accessGranted) {
    return <div>{t("dashboard.accessDenied")}</div>;
  }

  return (
    <div>
      <h1>{t("dashboard.performanceTitle")}</h1>
      <ul>
        {logs.map((log, i) => (
          <li key={i}>
            [{log.actor}] {log.action} on {log.listingId} — {new Date(log.timestamp).toLocaleString()}
            {log.notes && <p>{log.notes}</p>}
            {log.success !== undefined && (
              <p>{t("dashboard.status")}: {log.success ? "✅ Success" : "❌ Failed"}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}