"use client";

import { useState } from "react";

// 🧠 Define the structure of a flagged listing
type FlaggedListing = {
  listingId: string;
  reason: string;
  overrideRequired: boolean;
  overrideApproved?: boolean;
};

export default function ListingsDashboard() {
  const [flagged, setFlagged] = useState<FlaggedListing[]>([]);

  const runScan = async () => {
    try {
      const res = await fetch("/api/listings/review");
      const data: { flagged: FlaggedListing[] } = await res.json();
      setFlagged(data.flagged);
    } catch (error) {
      console.error("Scan failed:", error);
    }
  };

  const approveOverride = async (listingId: string) => {
    try {
      await fetch("/api/listings/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          approvedBy: "Council",
          notes: "Override approved. Emotional urgency verified. Visibility restored."
        })
      });
      setFlagged(prev =>
        prev.map(listing =>
          listing.listingId === listingId
            ? { ...listing, overrideApproved: true }
            : listing
        )
      );
    } catch (error) {
      console.error("Override failed:", error);
    }
  };

  return (
    <div>
      <h1>Listing Governance Panel</h1>
      <button onClick={runScan}>Run Emotional Scan</button>

      {flagged.length > 0 && (
        <ul>
          {flagged.map(listing => (
            <li key={listing.listingId}>
              <strong>{listing.listingId}</strong>: {listing.reason}
              {listing.overrideRequired && !listing.overrideApproved && (
                <button onClick={() => approveOverride(listing.listingId)}>
                  Approve Override
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}