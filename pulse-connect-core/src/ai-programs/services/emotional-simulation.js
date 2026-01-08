module.exports = function simulateFlags(userId) {
  const testSignals = ["silence", "confusion", "distress"];
  testSignals.forEach((flag) => {
    const result = detectEmotionalFlag(userId, [flag]);
    logAction(`flag_test_${flag}`, userId, result ? "triggered" : "clear");
  });
  return "Emotional flag simulation complete.";
};
