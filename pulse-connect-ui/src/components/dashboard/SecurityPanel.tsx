"use client";

import { ConsentSettings, DashboardFeatureAccess } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  saveLabel: string;
  consents: ConsentSettings;
  access: DashboardFeatureAccess[];
  complianceProfile: string;
  onUpdate: (consents: Partial<ConsentSettings>) => Promise<void>;
  loading: boolean;
};

const consentKeys: Array<keyof ConsentSettings> = [
  "privacyPolicy",
  "termsOfService",
  "dataProcessing",
  "marketing",
  "locationServices",
  "profiling",
];

export function SecurityPanel({ title, saveLabel, consents, access, complianceProfile, onUpdate, loading }: Props) {
  return (
    <SectionCard title={title} subtitle="Consent-aware operations, access controls, and privacy-first governance.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Consent Controls ({complianceProfile})</p>
          <div className="space-y-2">
            {consentKeys.map((key) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <span>{key}</span>
                <input
                  type="checkbox"
                  checked={consents[key]}
                  onChange={(event) => onUpdate({ [key]: event.target.checked })}
                  disabled={loading}
                />
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Tier Access Matrix</p>
          <div className="space-y-2 text-sm">
            {access.map((entry) => (
              <article key={entry.module} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">
                  {entry.module}: {entry.enabled ? "Enabled" : "Restricted"}
                </p>
                {!entry.enabled && entry.reason ? <p className="text-slate-600">{entry.reason}</p> : null}
              </article>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{saveLabel} applies immediately and is logged for compliance audit.</p>
        </div>
      </div>
    </SectionCard>
  );
}
