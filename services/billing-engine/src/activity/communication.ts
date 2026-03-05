import { ActivityEngine, UsageEvent } from '../types';

// communication: per-message or per-minute billing
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const units = event.units || 1; // interpret as minutes or messages
  let perUnit = 0.01; // $0.01 per unit
  if (policy && policy.payload && typeof policy.payload.perUnit === 'number') perUnit = policy.payload.perUnit;
  const base = units * perUnit;
  return { base, fees: 0, subtotal: base, tax: 0, total: base, description: `Communication ${units} units` };
};

export default { calculate };
