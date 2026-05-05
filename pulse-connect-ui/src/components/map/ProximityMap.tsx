"use client";

import React from "react";
import { Venue } from "../../../../pulse-connect-core/src/places/proximityIntegration";

interface ProximityMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  venues?: Venue[];
  userLocation?: { lat: number; lng: number };
  showDirections?: boolean;
  destination?: { lat: number; lng: number };
  mapStyle?: "standard" | "satellite" | "terrain" | "hybrid";
  enableDragging?: boolean;
  enableZoom?: boolean;
  showControls?: boolean;
  onVenueClick?: (venue: Venue) => void;
  onMapClick?: (location: { lat: number; lng: number }) => void;
}

const ProximityMap: React.FC<ProximityMapProps> = ({
  center = { lat: 0, lng: 0 },
  venues = [],
  userLocation,
  destination,
  showDirections = false,
  onVenueClick,
  onMapClick
}) => {
  const handleMapClick = () => {
    onMapClick?.(center);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={handleMapClick}
        className="mb-4 h-[420px] w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 text-left"
      >
        <div className="flex h-full items-center justify-center px-6 text-center text-slate-600">
          <div>
            <p className="text-base font-semibold text-slate-800">Map Preview (Fallback Mode)</p>
            <p className="mt-2 text-sm">
              Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
            </p>
            {userLocation ? (
              <p className="mt-1 text-sm">
                User: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            ) : null}
            {showDirections && destination ? (
              <p className="mt-1 text-sm">
                Destination: {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
              </p>
            ) : null}
          </div>
        </div>
      </button>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Venues ({venues.length})</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {venues.map((venue) => (
            <button
              key={venue.id}
              type="button"
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100"
              onClick={() => onVenueClick?.(venue)}
            >
              <p className="font-medium text-slate-900">{venue.name}</p>
              <p className="text-slate-600 capitalize">{venue.category}</p>
              <p className="text-slate-500">Score: {venue.proximityScore}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProximityMap;