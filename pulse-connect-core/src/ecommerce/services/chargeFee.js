module.exports = function chargeFee(tradeId, amount, flowType) {
  const feeRates = {
    basic: 0.0,
    negotiation: 0.05,
    financial: 0.03,
    relationship: 0.08,
    councilApproved: 0.06
  };

  const fee = amount * (feeRates[flowType] || 0.02);
  logAction("fee_charged", tradeId);
  return fee;
};
