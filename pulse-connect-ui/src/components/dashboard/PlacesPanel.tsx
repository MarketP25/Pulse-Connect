import { MatchmakingSuggestion, NearbyPlace } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  places: NearbyPlace[];
  matchmaking: MatchmakingSuggestion[];
  enabled: boolean;
  disabledReason?: string;
};

export function PlacesPanel({ title, places, matchmaking, enabled, disabledReason }: Props) {
  return (
    <SectionCard title={title} subtitle="Geocoding-powered nearby locations and service matchmaking recommendations.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Not available for this tier."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Nearby Places</p>
            <div className="space-y-2">
              {places.map((place) => (
                <article key={place.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{place.name}</p>
                  <p>
                    {place.category} | {place.distanceKm} km away
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900">Matchmaking</p>
            <div className="space-y-2">
              {matchmaking.map((item) => (
                <article key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  <p>{item.reason}</p>
                  <p className="text-xs text-slate-500">Compatibility: {item.compatibility}%</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
