module.exports = async function chargeFee(tradeId, amount, flowType) {
  const baseUrl = (process.env.PULSCO_BILLING_API_URL || process.env.BILLING_ENGINE_URL || "").replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error("billing_engine_not_configured");
  }

  const response = await fetch(`${baseUrl}/marp/activity/calculate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      region: "Europe West 1",
      event: {
        engine: "ecommerce",
        amount,
        eventId: String(tradeId || Date.now()),
        details: {
          mode: "legacy_fee",
          flowType,
          tradeId,
        },
      },
      at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error("billing_engine_quote_failed");
  }

  const quote = await response.json();
  const fee = Math.max(0, Number(quote.total) - Number(quote.base));
  logAction("fee_charged", tradeId);
  return fee;
};
