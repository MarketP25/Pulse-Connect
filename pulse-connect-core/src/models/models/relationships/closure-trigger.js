module.exports = function initiateClosure(userId) {
  if (requiresOverride("relationship_flows")) return "Override required";
  if (!hasPermission("admin-agent", "initiate_closure")) return "Permission denied";
  logAction("initiate_closure", userId);
  return runLegacyFlow("modules/relationships/closure", userId);
};
