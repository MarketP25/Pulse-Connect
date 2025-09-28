import fs from "fs";
import path from "path";

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { listingId, approvedBy = "Council", notes = "" } = req.body;

  const flaggedPath = path.join(process.cwd(), "data", "listing-flagged.json");
  const flagged = JSON.parse(fs.readFileSync(flaggedPath, "utf8"));

  const updated = flagged.map(entry =>
    entry.listingId === listingId
      ? {
          ...entry,
          overrideApproved: true,
          reviewedBy: approvedBy,
          notes,
          timestamp: new Date().toISOString()
        }
      : entry
  );

  fs.writeFileSync(flaggedPath, JSON.stringify(updated, null, 2));

  res.status(200).json({ success: true, listingId, override: true });
}