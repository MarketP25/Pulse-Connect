export interface LocalizationPricing {
  type: 'text' | 'speech' | 'video';
  tier: 'fast' | 'standard' | 'premium';
}

export function priceForLocalization(chars: number, seconds: number, pricing: LocalizationPricing) {
  // Simplified rates
  const perChar = pricing.tier === 'fast' ? 0.001 : pricing.tier === 'standard' ? 0.0015 : 0.002;
  const perSecond = pricing.type === 'video' ? 0.05 : pricing.type === 'speech' ? 0.02 : 0.0;
  const charCost = +(chars * perChar).toFixed(4);
  const timeCost = +(seconds * perSecond).toFixed(2);
  return +(charCost + timeCost).toFixed(2);
}
