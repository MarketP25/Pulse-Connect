module.exports = function summarizeFeedback(sessionId) {
  if (!hasPermission("admin-agent", "send_council_updates")) return "Permission denied";
  logAction("feedback_summary", sessionId);
  return runLegacyFlow("modules/council/updates/summarize", sessionId);
};
