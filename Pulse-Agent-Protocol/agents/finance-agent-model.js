module.exports = {
  executeTrade(data) {
    const { userId, amount, flowType, userTier } = data;

    if (userTier === "basic" && flowType === "financial") {
      return "Access denied: Upgrade required for financial flows.";
    }

    if (!hasPermission("finance-agent", "execute_trade")) {
      return "Permission denied";
    }

    logAction("trade_execution", userId);
    chargeFee(data.tradeId, amount, flowType);

    return "Trade executed";
  }
};