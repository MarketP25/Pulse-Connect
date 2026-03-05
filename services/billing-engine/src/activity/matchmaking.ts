import { ActivityEngine, UsageEvent } from '../types';

// matchmaking: per-match fee
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const units = event.units || 1;
  let perMatch = 0.05; // $0.05 per match
  if (policy && policy.payload && typeof policy.payload.perUnit === 'number') perMatch = policy.payload.perUnit;
  const base = units * perMatch;
  const fees = 0;
  const subtotal = base + fees;
  return { base, fees, subtotal, tax: 0, total: subtotal, description: `Matchmaking ${units} matches` };
};

export default { calculate };
