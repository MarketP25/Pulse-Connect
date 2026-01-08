module.exports = {
  formatListing(data) {
    if (!hasPermission("outreach-agent", "format_listing")) return "Permission denied";
    logAction("listing_format", data.userId);
    return generateTemplate("negotiation-template.md", data);
  }
};
