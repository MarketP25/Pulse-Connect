"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { verifyAccess } from "@/middleware/VerifyCode.";

type EarningsRecord = {
  date: string;
  source: "listing" | "override" | "subscription" | "donation";
  amount: number;
  currency: "KES" | "USD";
  userId?: string;
  notes?: string;
};

export default function EarningsDashboard() {
  const t = useTranslations();
  const accessGranted = verifyAccess(process.env.NEXT_PUBLIC_VERIFICATION_CODE || "");

  const [records, setRecords] = useState<EarningsRecord[]>([]);

  useEffect(() => {
    if (accessGranted) {
      fetch("/api/earnings")
        .then(res => res.json())
        .then((data: { records: EarningsRecord[] }) => setRecords(data.records));
    }
  }, [accessGranted]);

  if (!accessGranted) {
    return <div>{t("dashboard.accessDenied")}</div>;
  }

  const total = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{t("dashboard.earningsTitle")}</h1>
      <p className="mb-2">{t("dashboard.totalEarnings")}: {total} KES</p>
      <ul className="space-y-2">
        {records.map((r, i) => (
          <li key={i} className="border p-3 rounded-md">
            <strong>{r.source}</strong> — {r.amount} {r.currency}  
            <br />
            <span>{new Date(r.date).toLocaleDateString()}</span>
            {r.notes && <p className="text-sm text-gray-600 mt-1">{r.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}