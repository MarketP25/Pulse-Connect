export function purchaseTokens(packType: 'base' | 'negotiation' | 'financial' | 'council', amount?: number) {
  // Simple mapping: $40 -> 20k tokens base; execution costs are per-op
  if (packType === 'base') return { price: 40, tokens: 20000 };
  return { price: 0, tokens: 0 };
}

export function executionCost(type: 'basic' | 'negotiation' | 'financial' | 'council', chars?: number) {
  switch (type) {
    case 'basic': return 0;
    case 'negotiation': return 0.05;
    case 'financial': return 0.03;
    case 'council': return 0.06 * (chars || 1);
    default: return 0;
  }
}
