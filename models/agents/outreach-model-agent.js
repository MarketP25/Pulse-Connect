module.exports = {
  launchCampaign(campaignId) {
    if (!hasPermission("outreach-agent", "send_campaigns")) return "Permission denied";
    if (detectEmotionalFlag(campaignId, ["silence", "distress"])) return "Paused: Emotional flag triggered";
    logAction("campaign", campaignId);
    return runLegacyFlow("modules/outreach/marketing/launch", campaignId);
  }
};