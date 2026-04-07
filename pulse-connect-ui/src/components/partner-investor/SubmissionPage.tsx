"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ApplicationType = "partner" | "investor";

type ApplicationRecord = {
  id: string;
  userId: string;
  type: ApplicationType;
  status: "pending_review" | "approved" | "rejected" | "under_review";
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  payload: Record<string, unknown>;
};

type Props = {
  type: ApplicationType;
  userId: string;
};

function titleFromType(type: ApplicationType) {
  return type === "partner" ? "Partner Application" : "Investor Application";
}

function endpointFromType(type: ApplicationType) {
  return type === "partner"
    ? "/api/dashboard/partner-application"
    : "/api/dashboard/investor-application";
}

export function SubmissionPage({ type, userId }: Props) {
  const [organizationName, setOrganizationName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);

  const endpoint = useMemo(() => endpointFromType(type), [type]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${endpoint}?userId=${encodeURIComponent(userId)}`, {
        method: "GET",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => ({}))) as {
        applications?: ApplicationRecord[];
        message?: string;
      };
      if (!response.ok) {
        throw new Error(payload.message || `Failed to fetch ${type} applications`);
      }
      setApplications(Array.isArray(payload.applications) ? payload.applications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, [endpoint, userId]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${endpoint}?userId=${encodeURIComponent(userId)}`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          website: website.trim(),
          contactEmail: contactEmail.trim(),
          summary: summary.trim()
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        application?: ApplicationRecord;
        applications?: ApplicationRecord[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.message || "Submission failed");
      }

      setApplications(Array.isArray(payload.applications) ? payload.applications : applications);
      setSummary("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{titleFromType(type)}</h1>
        <Link
          href={`/dashboard?userId=${encodeURIComponent(userId)}`}
          className="text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          Back to Dashboard
        </Link>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4">
          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Organization / Entity Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Website</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              placeholder="https://"
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Contact Email</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              required
            />
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-700">Application Summary</span>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              rows={5}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              required
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
          {error ? <span className="text-sm text-rose-700">{error}</span> : null}
        </div>
      </form>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Submission History</h2>
        {loading ? <p className="mt-2 text-sm text-slate-600">Loading...</p> : null}
        {!loading && applications.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No submissions yet.</p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {applications.map((application) => (
            <li key={application.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">{application.id}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {application.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Submitted: {new Date(application.createdAt).toLocaleString()}
                {application.reviewedAt
                  ? ` | Reviewed: ${new Date(application.reviewedAt).toLocaleString()}`
                  : ""}
              </p>
              {application.notes ? (
                <p className="mt-2 text-sm text-slate-700">Notes: {application.notes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
