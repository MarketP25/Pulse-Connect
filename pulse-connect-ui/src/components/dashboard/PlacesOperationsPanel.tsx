"use client";

import { useState } from "react";
import { DashboardPlacesOperationsModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardPlacesOperationsModule;
  enabled: boolean;
  disabledReason?: string;
  loading: boolean;
  onRunAction: (
    action: "create_place" | "create_booking" | "cancel_booking",
    payload: Record<string, unknown>,
  ) => Promise<void>;
};

export function PlacesOperationsPanel({ title, data, enabled, disabledReason, loading, onRunAction }: Props) {
  const [placeName, setPlaceName] = useState("PULSCO Workspace");
  const [placeCategory, setPlaceCategory] = useState("workspace");
  const [bookingPlaceId, setBookingPlaceId] = useState("");
  const [bookingAmount, setBookingAmount] = useState("120");

  return (
    <SectionCard title={title} subtitle="Place publishing, booking operations, and place-ledger transactions.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Places operations are unavailable."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Managed Places</p>
            {(data?.places || []).map((place) => (
              <article key={place.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{place.name}</p>
                <p>
                  {place.category} | {place.status}
                </p>
              </article>
            ))}

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-semibold text-slate-900">Create Place</p>
              <input
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1"
                value={placeName}
                onChange={(event) => setPlaceName(event.target.value)}
              />
              <input
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1"
                value={placeCategory}
                onChange={(event) => setPlaceCategory(event.target.value)}
              />
              <button
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                onClick={() => onRunAction("create_place", { name: placeName, category: placeCategory })}
                disabled={loading}
              >
                Create Place
              </button>
            </div>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Bookings</p>
            {(data?.bookings || []).map((booking) => (
              <article key={booking.id} className="rounded-lg border border-slate-200 p-2">
                <p>
                  Place {booking.placeId} | ${booking.totalUsd}
                </p>
                <p>{booking.status}</p>
                {booking.status !== "cancelled" ? (
                  <button
                    className="mt-1 rounded bg-amber-700 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
                    onClick={() => onRunAction("cancel_booking", { bookingId: booking.id, reason: "dashboard_cancelled" })}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                ) : null}
              </article>
            ))}

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 font-semibold text-slate-900">Create Booking</p>
              <input
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1"
                value={bookingPlaceId}
                onChange={(event) => setBookingPlaceId(event.target.value)}
                placeholder="Place ID"
              />
              <input
                className="mb-2 w-full rounded border border-slate-300 px-2 py-1"
                value={bookingAmount}
                onChange={(event) => setBookingAmount(event.target.value)}
                placeholder="Amount USD"
              />
              <button
                className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
                onClick={() =>
                  onRunAction("create_booking", {
                    placeId: bookingPlaceId,
                    totalUsd: Number(bookingAmount || 0),
                    startAt: new Date().toISOString(),
                    endAt: new Date(Date.now() + 7_200_000).toISOString(),
                  })
                }
                disabled={loading}
              >
                Create Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

