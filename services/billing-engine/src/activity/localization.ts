import { ActivityEngine, UsageEvent } from '../types';

// Localization: per-character or per-string pricing
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const chars = (event.details && event.details.chars) || 0;
  let perChar = 0.001; // $0.001 per char
  if (policy && policy.payload && typeof policy.payload.perChar === 'number') perChar = policy.payload.perChar;
  const base = chars * perChar;
  const subtotal = base;
  return { base, fees: 0, subtotal, tax: 0, total: subtotal, description: `Localization ${chars} chars` };
};

export default { calculate };
