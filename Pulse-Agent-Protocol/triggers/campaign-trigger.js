module.exports = function launchCampaign(campaignId) {
  if (!hasPermission("outreach-agent", "send_campaigns")) return "Permission denied";
  logAction("campaign", campaignId);
  return runLegacyFlow("modules/outreach/marketing/launch", campaignId);
}