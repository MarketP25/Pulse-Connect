module.exports = function detectEmotionalFlag(targetId, flags) {
  const emotionalSignals = getUserSignals(targetId); // e.g. silence, distress, confusion
  return flags.some(flag => emotionalSignals.includes(flag));
};