import React, { useState } from 'react';

export default function KYCForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [nationality, setNationality] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');

    try {
      const body = {
        seller_id: 'current-seller', // Replace with real seller id from auth
        verification_type: 'basic',
        personal_info: {
          first_name: firstName,
          last_name: lastName,
          date_of_birth: dob,
          nationality,
          address: {
            street: '',
            city: '',
            state: '',
            postal_code: '',
            country: ''
          }
        },
        documents: [],
        trace_id: `trace-${Date.now()}`
      };

      const res = await fetch('/api/kyc/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json();
        setStatus(`Error: ${err.error || res.statusText}`);
        return;
      }

      const data = await res.json();
      setStatus(`Submitted: ${data.status}`);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 600 }}>
      <h3>Submit KYC</h3>
      <div>
        <label>First name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div>
        <label>Last name</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <div>
        <label>Date of birth</label>
        <input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="YYYY-MM-DD" />
      </div>
      <div>
        <label>Nationality</label>
        <input value={nationality} onChange={(e) => setNationality(e.target.value)} />
      </div>
      <button type="submit">Submit KYC</button>
      {status && <div style={{ marginTop: 8 }}>{status}</div>}
    </form>
  );
}
