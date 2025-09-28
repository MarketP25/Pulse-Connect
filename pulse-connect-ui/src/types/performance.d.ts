export interface PerformanceLog {
  timestamp: string;
  actor: "bot" | "council";
  action: "override-reviewed" | "flagged" | "approved" | "rejected" | "escalated";
  listingId: string;
  notes?: string;
  success?: boolean;
}