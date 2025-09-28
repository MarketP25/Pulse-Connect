module.exports = function hasPermission(agentRole, action) {
  const roleConfig = require(`../agents/${agentRole}.json`);
  return roleConfig.permissions.includes(action);
};