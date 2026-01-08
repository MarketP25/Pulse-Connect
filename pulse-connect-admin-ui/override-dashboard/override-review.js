module.exports = function runOverrideReview() {
  const overrides = readJSON("pulse-agent-protocol/audit/override-history.json");
  const flagged = readJSON("pulse-agent-protocol/audit/flagged-actions.json");

  const summary = {
    totalOverrides: overrides.length,
    flaggedActions: flagged.length,
    unresolvedFlags: flagged.filter((f) => !f.resolved).length,
    lastOverride: overrides[overrides.length - 1] || "None"
  };

  return summary;
};
