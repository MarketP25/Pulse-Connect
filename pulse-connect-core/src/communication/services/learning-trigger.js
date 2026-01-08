module.exports = function assistLearning(userId) {
  if (!hasPermission("learning-agent", "summarize_lessons")) return "Permission denied";
  logAction("learning_assist", userId);
  return runLegacyFlow("modules/literacy/assist", userId);
};
