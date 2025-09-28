const scanListing = require("./emotional-scan");

function processListing(listing) {
  const flagged = scanListing(listing);

  if (flagged) {
    return { action: "flagged", data: flagged };
  }

  const reviewed = {
    listingId: listing.listingId,
    approvedBy: "Council",
    status: "active",
    notes: "Listing passed emotional scan and checklist.",
    timestamp: new Date().toISOString()
  };

  const publicView = {
    listingId: listing.listingId,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    category: listing.category,
    tags: listing.tags,
    price: listing.price,
    currency: listing.currency,
    language: listing.language,
    status: "active"
  };

  return {
    action: "approved",
    reviewed,
    publicView
  };
}

module.exports = processListing;