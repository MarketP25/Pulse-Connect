import { ActivityEngine, UsageEvent } from '../types';

// AI programs: per-token pricing (example)
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const tokens = event.units || 0;
  let perToken = 0.0001; // $0.0001 per token
  if (policy && policy.payload && typeof policy.payload.perToken === 'number') perToken = policy.payload.perToken;
  const base = tokens * perToken;
  const fees = 0;
  const subtotal = base + fees;
  return { base, fees, subtotal, tax: 0, total: subtotal, description: `AI usage ${tokens} tokens` };
};

export default { calculate };
