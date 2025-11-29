// src/lib/upgradePlans.ts

export type Currency = "USD" | "KES" | "EUR";
export type ProgramType = "marketing" | "workout" | "tutorial" | "forex";
export interface SubscriptionPlan {
  id: string;
  name: string;
  prices: Record<Currency, number>;
}

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  marketing: "Marketing Campaign Ideas",
  workout: "Workout Plans",
  tutorial: "Step-by-Step Tutorials",
  forex: "Forex AI Classes",
};

export const PLAN_REQUIREMENTS: Record<ProgramType, string[]> = {
  marketing: ["basic", "plus", "pro", "patron", "patronTrial"],
  workout: ["plus", "pro", "patron", "patronTrial"],
  tutorial: ["pro", "patron", "patronTrial"],
  forex: ["pro", "patron", "patronTrial"],
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  { id: "basic", name: "Basic", prices: { USD: 10, KES: 1000, EUR: 9 } },
  { id: "plus", name: "Plus", prices: { USD: 20, KES: 2500, EUR: 18 } },
  { id: "pro", name: "Pro", prices: { USD: 30, KES: 4000, EUR: 26 } },
  { id: "patron", name: "Patron", prices: { USD: 45, KES: 6000, EUR: 40 } },
  { id: "patronTrial", name: "Patron Trial", prices: { USD: 0, KES: 0, EUR: 0 } },
];

export const DONATION_TIERS = [
  { name: "Spark", kes: "KES 1500", usd: "$15", desc: "Unlimited campaigns & uploads.", paypalAmt: "15" },
  { name: "Patron", kes: "KES 2500", usd: "$25", desc: "Early features + badge.", paypalAmt: "25" },
  { name: "Investor", kes: "KES 10,000", usd: "$100", desc: "Partner status + spotlight.", paypalAmt: "100" },
];
