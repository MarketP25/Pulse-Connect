module.exports = function testTrigger() {
  if (!hasPermission("test-agent", "run_test")) return "Permission denied";
  return runLegacyFlow("modules/sandbox/test-flow");
};
