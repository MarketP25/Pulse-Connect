module.exports = function summarizeVotes(version) {
  const votes = readJSON("pulse-agent-protocol/audit/council-votes.json");
  const filtered = votes.filter((v) => v.version === version);
  const summary = {
    approve: filtered.filter((v) => v.vote === "approve").length,
    reject: filtered.filter((v) => v.vote === "reject").length,
    pause: filtered.filter((v) => v.vote === "pause").length,
    total: filtered.length
  };
  return summary;
};
