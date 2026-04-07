import React, { useEffect, useState } from "react";

export const BillingWidget: React.FC<{ accountId: string }> = ({ accountId }) => {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    fetch(
      `${process.env.NEXT_PUBLIC_BILLING_URL || "http://localhost:3100"}/marp/ledger/${accountId}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (mounted) setEntries(data);
      })
      .catch(() => {
        if (mounted) setEntries([]);
      });
    return () => {
      mounted = false;
    };
  }, [accountId]);

  return (
    <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 6 }}>
      <h4>Billing Activity</h4>
      {entries.length === 0 && <div>No recent billing entries.</div>}
      <ul>
        {entries.map((e) => (
          <li key={e.entryId}>
            <strong>{e.type}</strong>: {e.amount} {e.currency} —{" "}
            {new Date(e.timestamp).toLocaleString()}
            <br />
            <small>
              {e.userExplanation} {e.policyId ? `(policy ${e.policyId}@${e.policyVersion})` : null}
            </small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BillingWidget;
