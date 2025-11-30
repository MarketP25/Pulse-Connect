const fs = require("fs");
const scanListing = require("./emotional-scan.cjs");
const processListing = require("./listing-flow");

const submittedPath = "../data/listing-submitted.json";
const flaggedPath = "../audit/listing-flagged.json";
const reviewedPath = "../data/listing-reviewed.json";
const publicPath = "../data/listing-public.json";

const submittedListings = JSON.parse(fs.readFileSync(submittedPath));
const flaggedListings = [];
const reviewedListings = [];
const publicListings = [];

submittedListings.forEach((listing) => {
  const result = processListing(listing);

  if (result.action === "flagged") {
    flaggedListings.push(result.data);
  }

  if (result.action === "approved") {
    reviewedListings.push(result.reviewed);
    publicListings.push(result.publicView);
  }
});

fs.writeFileSync(flaggedPath, JSON.stringify(flaggedListings, null, 2));
fs.writeFileSync(reviewedPath, JSON.stringify(reviewedListings, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(publicListings, null, 2));

console.log("✅ Pulse Connect listing pipeline complete.");