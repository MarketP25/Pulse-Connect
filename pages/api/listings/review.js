import scanListing from "@/logic/emotional-scan.cjs";
import listings from "@/data/listing-submitted.json";
import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const flagged = listings
    .map(scanListing)
    .filter(Boolean)
    .map((entry, index) => ({
      ...entry,
      flagId: `FLAG${String(index + 1).padStart(3, "0")}`
    }));

  fs.writeFileSync(
    path.join(process.cwd(), "data", "listing-flagged.json"),
    JSON.stringify(flagged, null, 2)
  );

  res.status(200).json({ flagged });
}