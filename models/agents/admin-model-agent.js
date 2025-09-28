module.exports = {
  triggerOnboarding(userId) {
    if (!hasPermission("admin-agent", "trigger_onboarding")) return "Permission denied";
    if (detectEmotionalFlag(userId, ["silence", "confusion"])) return "Paused: Emotional flag triggered";
    logAction("onboarding", userId);
    return runLegacyFlow("modules/admin/onboarding/start", userId);
  }
};