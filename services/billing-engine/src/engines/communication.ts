export function chargeMinutes(minutes: number) {
  // $20 per 100 minutes -> $0.20 per minute
  const perMinute = 20 / 100;
  return +(minutes * perMinute).toFixed(2);
}
