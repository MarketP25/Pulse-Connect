export function placesCommission(amount: number) {
  if (amount < 4000) return +(amount * 0.07).toFixed(2);
  if (amount < 10000) return +(amount * 0.03).toFixed(2);
  return +(amount * 0.015).toFixed(2);
}
