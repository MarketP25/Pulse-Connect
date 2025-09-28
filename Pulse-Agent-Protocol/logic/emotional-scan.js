function scanListing(listing) {
  const triggers = ["urgent", "desperate", "eviction", "must sell", "emergency"];
  const flagged = triggers.some(trigger =>
    listing.description.toLowerCase().includes(trigger)
  );

  if (flagged) {
    return {
      listingId: listing.listingId,
      triggeredBy: "emotional-scan",
      reason: `Trigger detected in description: "${listing.description}"`,
      status: "paused",
      overrideRequired: true,
      reviewedBy: "Council",
      timestamp: new Date().toISOString()
    };
  }

  return null;
}

module.exports = scanListing;