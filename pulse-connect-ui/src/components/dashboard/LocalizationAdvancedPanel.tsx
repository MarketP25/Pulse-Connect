import { DashboardLocalizationAdvancedModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardLocalizationAdvancedModule;
};

export function LocalizationAdvancedPanel({ title, data }: Props) {
  return (
    <SectionCard title={title} subtitle="Provider health, language coverage, and advanced localization intelligence.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Provider Health</p>
          <div className="space-y-2 text-sm text-slate-700">
            {(data?.providerHealth || []).map((provider) => (
              <article key={provider.provider} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{provider.provider}</p>
                <p>
                  {provider.status} | {provider.latencyMs}ms | Error rate {provider.errorRate}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Language Coverage</p>
          <div className="space-y-2 text-sm text-slate-700">
            {(data?.languageCoverage || []).map((language) => (
              <article key={language.language} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{language.language.toUpperCase()}</p>
                <p>Quality: {language.quality}</p>
                <p>Regions: {language.regions.join(", ")}</p>
              </article>
            ))}
          </div>
          {data?.sampleTranslation ? (
            <article className="mt-3 rounded-lg border border-slate-200 p-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Sample Translation</p>
              <p>
                {data.sampleTranslation.sourceText} {"->"} {data.sampleTranslation.translatedText}
              </p>
              <p className="text-xs text-slate-500">Provider: {data.sampleTranslation.provider}</p>
            </article>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
