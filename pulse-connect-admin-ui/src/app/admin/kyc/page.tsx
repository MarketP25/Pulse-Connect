import React, { useEffect, useState } from 'react';

export default function AdminKYCPage() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kyc/pending');
      const data = await res.json();
      setPending(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const review = async (id: string, decision: 'approve' | 'reject') => {
    await fetch(`/api/kyc/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_id: 'admin1', decision })
    });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>Pending KYC Reviews</h2>
      {loading && <div>Loading…</div>}
      <ul>
        {pending.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <div>
              <strong>{p.seller_id}</strong> — {p.status} — risk {p.risk_score}
            </div>
            <div style={{ marginTop: 6 }}>
              <button onClick={() => review(p.id, 'approve')}>Approve</button>
              <button onClick={() => review(p.id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
