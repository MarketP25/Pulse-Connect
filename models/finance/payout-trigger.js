module.exports = function verifyPayout(userId) {
  if (requiresOverride("financial_flows")) return "Override required";
  if (!hasPermission("admin-agent", "verify_payout")) return "Permission denied";
  logAction("verify_payout", userId);
  return runLegacyFlow("modules/finance/payout", userId);
}