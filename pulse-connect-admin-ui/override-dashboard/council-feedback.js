module.exports = function submitFeedback(actionId, comment) {
  const feedback = {
    action: actionId,
    comment: comment,
    submitted_by: "Council_Admin",
    timestamp: new Date().toISOString()
  };
  appendToJSON("pulse-agent-protocol/audit/flagged-actions.json", feedback);
  return "Feedback submitted.";
}