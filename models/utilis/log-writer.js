const fs = require("fs");
const path = require("path");

module.exports = function logAction(actionType, targetId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    agent: actionType.split("_")[0] + "-agent",
    action: actionType,
    target: targetId,
    status: "executed"
  };

  const logPath = path.join(__dirname, "../../pulse-agent-protocol/audit/agent-log.db");
  const existingLogs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
  existingLogs.push(logEntry);
  fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
};