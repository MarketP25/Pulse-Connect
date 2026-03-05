export function aiProgramPurchase(plan: 'small' | 'medium' | 'large') {
  switch (plan) {
    case 'small': return { price: 3, tokens: 1600 };
    case 'medium': return { price: 5, tokens: 4800 };
    case 'large': return { price: 15, tokens: 16000 };
    default: return { price: 0, tokens: 0 };
  }
}
