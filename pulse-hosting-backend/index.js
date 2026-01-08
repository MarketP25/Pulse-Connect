const express = require("express");
const { createDroplet } = require("./src/provision");
const { Pool } = require('pg');
const { ComplianceService } = require('../pulse-connect-core/src/ecommerce/services/compliance.service');
const { createComplianceRouter } = require('../pulse-connect-core/src/ecommerce/controllers/compliance.controller');
const { createAIDecisionClientFromEnv } = require('../pulse-connect-core/src/ecommerce/services/ai-decision-client');

const app = express();
app.use(express.json());

// Initialize DB pool and compliance service
const pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.PG_CONNECTION || null });
const aiClient = createAIDecisionClientFromEnv();
const complianceService = new ComplianceService(pool, aiClient || undefined);

// Mount compliance API under /api
app.use('/api', createComplianceRouter(complianceService));

// Optional in-process scheduler to run expireOldKYC periodically
const { startKYCScheduler } = require('./src/scheduler');
const schedulerEnabled = process.env.ENABLE_KYC_SCHEDULER === 'true' || false;
const stopScheduler = startKYCScheduler(complianceService, schedulerEnabled);

process.on('SIGINT', () => {
  if (stopScheduler) stopScheduler();
  process.exit(0);
});

app.post("/launch", async (req, res) => {
  const { clientName } = req.body;
  await createDroplet(clientName);
  res.send(`🚀 Hosting launched for ${clientName}`);
});

app.listen(3000, () => {
  console.log("🌐 Pulse Connect Hosting API running on port 3000");
});
