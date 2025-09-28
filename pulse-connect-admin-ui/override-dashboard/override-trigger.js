module.exports = function triggerOverride(actionId, reason) {
  const overrideEntry = {
    timestamp: new Date().toISOString(),
    action: actionId,
    override_by: "Founder",
    reason: reason
  };
  appendToJSON("pulse-agent-protocol/audit/override-history.json", overrideEntry);
  return "Override logged and executed.";
}