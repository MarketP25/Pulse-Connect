export interface EarningsRecord {
  date: string; // ISO timestamp
  source: "listing" | "override" | "subscription" | "donation";
  amount: number;
  currency: "KES" | "USD";
  userId?: string;
  notes?: string;
}