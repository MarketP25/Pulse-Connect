const fs = require("fs");
const path = require("path");

module.exports = function logAction(actionType, targetId) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: actionType,
    target: targetId,
    status: "executed"
  };

  const logPath = path.join(__dirname, "../audit/trade-history.json");
  const existingLogs = fs.existsSync(logPath) ? JSON.parse(fs.readFileSync(logPath)) : [];
  existingLogs.push(logEntry);
  fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2));
};