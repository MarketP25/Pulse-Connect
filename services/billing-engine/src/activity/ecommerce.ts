import { ActivityEngine, UsageEvent } from '../types';

// simple ecommerce: charge is percentage fee + fixed fee on transaction amount
export const calculate: ActivityEngine = (event: UsageEvent, region, atIso, policy) => {
  const amount = event.amount || 0;
  // defaults
  let percentFee = 0.025; // 2.5%
  let fixed = 0.30; // $0.30 per transaction
  // policy overrides
  if (policy && policy.payload) {
    if (typeof policy.payload.percentFee === 'number') percentFee = policy.payload.percentFee;
    if (typeof policy.payload.fixed === 'number') fixed = policy.payload.fixed;
  }
  const fees = +(amount * percentFee) + fixed;
  const subtotal = +(amount + fees);
  const tax = 0; // tax handled at region layer
  const total = +(subtotal + tax);
  return { base: amount, fees, subtotal, tax, total, description: 'E-commerce transaction fee' };
};

export default { calculate };
