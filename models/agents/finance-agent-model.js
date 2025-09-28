module.exports = {
  executeTrade(data) {
    const { userId, amount, flowType, userTier } = data;

    // 🔐 Tier check for override-sensitive flows
    if (userTier === "basic" && flowType === "financial") {
      return "Access denied: Upgrade required for financial flows.";
    }

    // ✅ Permission check
    if (!hasPermission("finance-agent", "execute_trade")) {
      return "Permission denied";
    }

    // 🧾 Log and charge fee
    logAction("trade_execution", userId);
    chargeFee(data.tradeId, amount, flowType);

    return "Trade executed";
  }
};