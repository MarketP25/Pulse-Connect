export function commissionForMatch(amount: number) {
  if (amount < 100) return +(amount * 0.07).toFixed(2);
  if (amount < 1000) return +(amount * 0.035).toFixed(2);
  return +(amount * 0.02).toFixed(2);
}

export function lockCommissionOnAcceptance(transactionId: string, amount: number) {
  const commission = commissionForMatch(amount);
  return { transactionId, amount, commission };
}
