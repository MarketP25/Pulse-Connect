module.exports = {
  assistLearning(userId) {
    if (!hasPermission("learning-agent", "summarize_lessons")) return "Permission denied";
    if (detectEmotionalFlag(userId, ["confusion", "disengagement"]))
      return "Paused: Emotional flag triggered";
    logAction("learning_assist", userId);
    return runLegacyFlow("modules/literacy/assist", userId);
  }
};
