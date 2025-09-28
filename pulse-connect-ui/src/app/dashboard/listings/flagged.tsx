"use client";

import { useEffect, useState } from "react";

// 🧠 Define the structure of a flagged listing
type FlaggedListing = {
  listingId: string;
  reason: string;
  overrideRequired: boolean;
  overrideApproved?: boolean;
};

export default function FlaggedListings() {
  const [flagged, setFlagged] = useState<FlaggedListing[]>([]);

  useEffect(() => {
    fetch("/api/listings/review")
      .then(res => res.json())
      .then((data: { flagged: FlaggedListing[] }) => setFlagged(data.flagged));
  }, []);

  return (
    <div className="flagged-listings">
      <h1>Flagged Listings</h1>
      <ul>
        {flagged.map(listing => (
          <li key={listing.listingId}>
            <strong>{listing.listingId}</strong>: {listing.reason}
            {listing.overrideRequired && !listing.overrideApproved && (
              <span className="pending">Override Pending</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}