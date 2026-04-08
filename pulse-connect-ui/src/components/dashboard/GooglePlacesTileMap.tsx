"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NearbyPlace } from "@/types/dashboard";

type Props = {
  places: NearbyPlace[];
};

type MapLoadState = "loading" | "ready" | "missing_key" | "error";

const rawGoogleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || "";
const GOOGLE_MAPS_API_KEY =
  rawGoogleMapsApiKey && !/YOUR_GOOGLE_MAPS_API_KEY|REPLACE_ME/i.test(rawGoogleMapsApiKey)
    ? rawGoogleMapsApiKey
    : "";
const SCRIPT_SELECTOR = "script[data-pulsco-google-maps='dashboard']";

let googleMapsScriptPromise: Promise<void> | null = null;

function getCategoryColor(category: string): string {
  if (category === "workspace") return "#00D9FF";
  if (category === "partner") return "#9D00FF";
  if (category === "fulfillment") return "#10B981";
  return "#3B82F6";
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if ((window as { google?: { maps?: unknown } }).google?.maps) {
    return Promise.resolve();
  }
  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(SCRIPT_SELECTOR) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.pulscoGoogleMaps = "dashboard";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

function createMarkerInfoContent(place: NearbyPlace): HTMLDivElement {
  const container = document.createElement("div");
  container.style.minWidth = "180px";

  const title = document.createElement("p");
  title.style.fontWeight = "600";
  title.style.margin = "0 0 4px 0";
  title.textContent = place.name;

  const details = document.createElement("p");
  details.style.margin = "0";
  details.style.fontSize = "12px";
  details.textContent = `${place.category} | ${place.distanceKm} km | score ${place.score}`;

  container.appendChild(title);
  container.appendChild(details);
  return container;
}

export function GooglePlacesTileMap({ places }: Props) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const markersRef = useRef<Array<{ setMap: (map: unknown) => void }>>([]);
  const infoWindowRef = useRef<{ setContent: (content: Node | string) => void; open: (options: unknown) => void } | null>(
    null
  );
  const [status, setStatus] = useState<MapLoadState>(GOOGLE_MAPS_API_KEY ? "loading" : "missing_key");

  const placesSignature = useMemo(
    () =>
      places
        .map((place) => `${place.id}:${place.latitude.toFixed(5)}:${place.longitude.toFixed(5)}:${place.score}`)
        .join("|"),
    [places]
  );

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!GOOGLE_MAPS_API_KEY) {
        setStatus("missing_key");
        return;
      }

      try {
        setStatus("loading");
        await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        if (cancelled || !mapContainerRef.current) {
          return;
        }

        const googleMaps = (window as { google?: { maps?: unknown } }).google?.maps as
          | {
              Map: new (element: HTMLElement, options: Record<string, unknown>) => unknown;
              Marker: new (options: Record<string, unknown>) => { setMap: (map: unknown) => void };
              InfoWindow: new () => {
                setContent: (content: Node | string) => void;
                open: (options: unknown) => void;
              };
              LatLngBounds: new () => { extend: (position: { lat: number; lng: number }) => void };
              SymbolPath: { CIRCLE: unknown };
            }
          | undefined;

        if (!googleMaps) {
          setStatus("error");
          return;
        }

        if (!mapRef.current) {
          mapRef.current = new googleMaps.Map(mapContainerRef.current, {
            center: { lat: 20, lng: 0 },
            zoom: 2,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            clickableIcons: false
          });
          infoWindowRef.current = new googleMaps.InfoWindow();
        }

        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        if (places.length === 0) {
          setStatus("ready");
          return;
        }

        const bounds = new googleMaps.LatLngBounds();
        const map = mapRef.current as {
          setCenter: (center: { lat: number; lng: number }) => void;
          setZoom: (zoom: number) => void;
          fitBounds: (bounds: unknown) => void;
        };

        places.forEach((place, index) => {
          const position = { lat: place.latitude, lng: place.longitude };
          const marker = new googleMaps.Marker({
            map,
            position,
            title: place.name,
            label: {
              text: String(index + 1),
              color: "#0A1428",
              fontWeight: "700"
            },
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              fillColor: getCategoryColor(place.category),
              fillOpacity: 0.9,
              strokeColor: "#0A1428",
              strokeWeight: 1.5,
              scale: Math.max(8, Math.min(12, Math.round(place.score / 10)))
            }
          }) as {
            addListener: (eventName: string, handler: () => void) => void;
            setMap: (target: unknown) => void;
          };

          marker.addListener("click", () => {
            if (!infoWindowRef.current) {
              return;
            }
            infoWindowRef.current.setContent(createMarkerInfoContent(place));
            infoWindowRef.current.open({ anchor: marker, map });
          });

          bounds.extend(position);
          markersRef.current.push(marker);
        });

        if (places.length === 1) {
          map.setCenter({ lat: places[0].latitude, lng: places[0].longitude });
          map.setZoom(12);
        } else {
          map.fitBounds(bounds);
        }

        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    void initMap();

    return () => {
      cancelled = true;
    };
  }, [places, placesSignature]);

  if (status === "missing_key") {
    return (
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
        Google Maps API key is missing. Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...` to `pulse-connect-ui/.env.local`.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">
        Failed to load Google Maps tile provider. Verify API key validity and Maps JavaScript API access.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-nebula-500/70 bg-orbit-blue-800/70 p-2">
        <div ref={mapContainerRef} className="h-56 w-full rounded-md" />
      </div>
      <p className="text-xs text-slate-300">
        Provider: Google Maps JS API ({status === "ready" ? "connected" : "loading"}) using `.env.local`.
      </p>
    </div>
  );
}
