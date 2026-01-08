module.exports = {
  checkTrade(data) {
    if (!hasPermission("admin-agent", "approve_trade")) return "Permission denied";
    if (detectEmotionalFlag(data.userId, ["urgency", "confusion"]))
      return "Paused: Emotional flag triggered";
    if (requiresOverride("financial_flows")) return "Override required";
    logAction("trade_check", data.userId);
    return "Trade approved";
  }
};
