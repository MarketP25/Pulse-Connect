import { DashboardRecommendation, MatchmakingSuggestion, NearbyPlace } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";
import { GooglePlacesTileMap } from "./GooglePlacesTileMap";

type Props = {
  title: string;
  places: NearbyPlace[];
  matchmaking: MatchmakingSuggestion[];
  recommendations?: DashboardRecommendation[];
  enabled: boolean;
  disabledReason?: string;
};

export function PlacesPanel({
  title,
  places,
  matchmaking,
  recommendations = [],
  enabled,
  disabledReason
}: Props) {
  const topRecommendations = recommendations.filter((item) => item.status === "suggested").slice(0, 3);

  return (
    <SectionCard
      title={title}
      subtitle="Google Maps tile provider with proximity-powered places, matchmaking, and location-aware recommendations."
    >
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
          {disabledReason || "Not available for this tier."}
        </p>
      ) : (
        <div className="space-y-4">
          <article className="rounded-xl border border-nebula-500/70 bg-nebula-900/60 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-tech-white">Proximity Map</p>
              <span className="rounded-md border border-pulse-cyan-500/40 bg-pulse-cyan-500/10 px-2 py-0.5 text-xs text-pulse-cyan-200">
                {places.length} mapped nodes
              </span>
            </div>

            <GooglePlacesTileMap places={places} />
          </article>

          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Nearby Places</p>
              <div className="space-y-2">
                {places.map((place) => (
                  <article
                    key={place.id}
                    className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">{place.name}</p>
                    <p>
                      {place.category} | {place.distanceKm} km away
                    </p>
                    <p className="text-xs text-slate-500">
                      {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Matchmaking</p>
              <div className="space-y-2">
                {matchmaking.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
                  >
                    <p className="font-semibold text-slate-900">{item.label}</p>
                    <p>{item.reason}</p>
                    <p className="text-xs text-slate-500">Compatibility: {item.compatibility}%</p>
                  </article>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Recommended Next Actions</p>
              <div className="space-y-2">
                {topRecommendations.length === 0 ? (
                  <article className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
                    AI and CSI recommendations will appear here after more interactions.
                  </article>
                ) : (
                  topRecommendations.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700"
                    >
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p>{item.detail}</p>
                      <p className="text-xs text-slate-500">
                        Source: {item.source} | Priority: {item.priority}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
