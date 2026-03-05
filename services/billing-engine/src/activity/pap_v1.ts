import { ActivityEngine, UsageEvent } from '../types';

// PAP v1: commission on platform transactions (percentage of amount)
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const amount = event.amount || 0;
  let commissionRate = 0.10;
  if (policy && policy.payload && typeof policy.payload.commissionRate === 'number') commissionRate = policy.payload.commissionRate;
  const commission = +(amount * commissionRate);
  const subtotal = amount - commission;
  const total = subtotal;
  return { base: amount, fees: commission, commission, subtotal, tax: 0, total, description: 'PAPv1 commission' };
};

export default { calculate };
