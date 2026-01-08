const POLL_INTERVAL_MS = parseInt(process.env.KYC_SCHEDULER_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10); // default daily

module.exports.startKYCScheduler = function (complianceService, enabled) {
  if (!enabled) return null;
  console.log('[scheduler] KYC scheduler enabled, running every', POLL_INTERVAL_MS, 'ms');

  const run = async () => {
    try {
      const expired = await complianceService.expireOldKYC();
      if (expired && expired > 0) {
        console.log('[scheduler] expired', expired, 'kyc records');
      }
    } catch (err) {
      console.error('[scheduler] error running expireOldKYC', err && err.message);
    }
  };

  // Run immediately then schedule
  run();
  const id = setInterval(run, POLL_INTERVAL_MS);
  return () => clearInterval(id);
};