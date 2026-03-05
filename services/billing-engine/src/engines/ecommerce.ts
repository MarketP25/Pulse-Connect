export interface WeeklySellerPlan { name: string; price: number; listings: number }

export const sellerPlans: WeeklySellerPlan[] = [
  { name: "starter", price: 25, listings: 50 },
  { name: "growth", price: 150, listings: 100 },
  { name: "enterprise", price: 450, listings: 250 },
];

export function weeklyChargeForPlan(planName: string) {
  const p = sellerPlans.find((x) => x.name === planName);
  if (!p) throw new Error("plan not found");
  return p.price;
}

export function listingOverageCharge(planName: string, extraListings: number) {
  // placeholder: $0.10 per extra listing
  return +(extraListings * 0.1);
}
