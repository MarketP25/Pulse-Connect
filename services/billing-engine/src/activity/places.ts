import { ActivityEngine, UsageEvent } from '../types';

// places: supports booking amount fee mode and simple per-unit fallback mode
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const details = event.details || {};
  const amount = typeof event.amount === "number" ? event.amount : 0;
  const mode = typeof details.mode === "string" ? details.mode : "checkin";

  if (amount > 0) {
    let percentFee = 0.03;
    let fixedFee = 0;
    let taxRate = 0.08;
    if (policy && policy.payload) {
      if (typeof policy.payload.percentFee === "number") percentFee = policy.payload.percentFee;
      if (typeof policy.payload.fixedFee === "number") fixedFee = policy.payload.fixedFee;
      if (typeof policy.payload.taxRate === "number") taxRate = policy.payload.taxRate;
    }
    const fees = +(amount * percentFee + fixedFee);
    const subtotal = +(amount + fees);
    const tax = +(subtotal * taxRate);
    const total = +(subtotal + tax);
    return { base: amount, fees, subtotal, tax, total, description: `Places ${mode} charge` };
  }

  const units = event.units || 1;
  let perUnit = 0.10;
  if (policy && policy.payload && typeof policy.payload.perUnit === "number") perUnit = policy.payload.perUnit;
  const base = +(units * perUnit);
  return { base, fees: 0, subtotal: base, tax: 0, total: base, description: `Places ${units} units` };
};

export default { calculate };
