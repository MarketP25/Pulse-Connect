"use client";

import { useEffect, useState } from "react";

type FlaggedListing = {
  listingId: string;
  reason: string;
  overrideRequired: boolean;
  overrideApproved?: boolean;
};

export default function OverrideDashboard() {
  const [flagged, setFlagged] = useState<FlaggedListing[]>([]);
  const [voiceNote, setVoiceNote] = useState<File | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/listings/review")
      .then(res => res.json())
      .then((data: { flagged: FlaggedListing[] }) => setFlagged(data.flagged));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, listingId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      setVoiceNote(e.target.files[0]);
      setSelectedListingId(listingId);
    }
  };

  const approve = async (listingId: string) => {
    const formData = new FormData();
    formData.append("listingId", listingId);
    formData.append("approvedBy", "Council");
    formData.append("notes", "Override approved. Emotional urgency verified.");
    if (voiceNote && selectedListingId === listingId) {
      formData.append("voiceNote", voiceNote);
    }

    await fetch("/api/listings/override", {
      method: "POST",
      body: formData
    });

    setFlagged(prev =>
      prev.map(listing =>
        listing.listingId === listingId
          ? { ...listing, overrideApproved: true }
          : listing
      )
    );
    setVoiceNote(null);
    setSelectedListingId(null);
  };

  return (
    <div>
      <h1>Override Dashboard</h1>
      <ul>
        {flagged
          .filter(l => l.overrideRequired && !l.overrideApproved)
          .map(listing => (
            <li key={listing.listingId}>
              <strong>{listing.listingId}</strong>: {listing.reason}
              <div>
                <label htmlFor={`voiceNoteUpload-${listing.listingId}`}>
                  Attach Voice Note
                </label>
                <input
                  id={`voiceNoteUpload-${listing.listingId}`}
                  type="file"
                  accept="audio/*"
                  title="Upload voice note explaining override reason"
                  onChange={(e) => handleFileChange(e, listing.listingId)}
                />
                <button onClick={() => approve(listing.listingId)}>
                  Approve with Voice Note
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}