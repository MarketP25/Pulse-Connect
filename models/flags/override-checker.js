module.exports = function requiresOverride(actionType) {
  const overrideRules = require("../protocol/override-rules.json");
  return overrideRules.required_for.includes(actionType);
};