"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type AuditLog = {
  action: string;
  timestamp: string;
  performedBy: string;
  notes?: string;
  voiceNoteUrl?: string;
};

export default function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const t = useTranslations();

  useEffect(() => {
    fetch("/api/listings/audit")
      .then(res => res.json())
      .then((data: { logs: AuditLog[] }) => setLogs(data.logs));
  }, []);

  return (
    <div>
      <h1>{t("dashboard.auditTitle")}</h1>
      <ul>
        {logs.map((log, index) => (
          <li key={index}>
            <strong>{log.action}</strong> by {log.performedBy}
            <br />
            <small>{new Date(log.timestamp).toLocaleString()}</small>
            {log.notes && <p>{log.notes}</p>}
            {log.voiceNoteUrl && (
              <audio controls src={log.voiceNoteUrl}></audio>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}