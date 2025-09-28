module.exports = function triggerOnboarding(userId) {
  if (!hasPermission("admin-agent", "trigger_onboarding")) return "Permission denied";
  logAction("onboarding", userId);
  return runLegacyFlow("modules/admin/onboarding/start", userId);
}