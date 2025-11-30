module.exports = function reviewFlags() {
  return readJSON("pulse-agent-protocol/audit/flagged-actions.json");
}