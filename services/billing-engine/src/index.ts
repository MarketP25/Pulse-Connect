import express from "express";
import { Pool } from "pg";
import { LedgerService } from "./services/ledger.service";
import { WalletService } from "./services/wallet.service";
import { RequestContext } from "@pulsco/shared/lib/requestContext"; // Assuming this path

const app = express();
const port = process.env.PORT || 3100;

/**
 * Database Connection Pools
 * Primary: Used for all writes and hardened ledger operations.
 * Secondary: Used specifically for read-only scaling and health verification.
 */
const primaryPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const secondaryPool = process.env.SECONDARY_DATABASE_URL
  ? new Pool({
      connectionString: process.env.SECONDARY_DATABASE_URL,
      max: 2 // Low connection limit for health checks and read-only monitoring
    })
  : null;

const ledgerService = new LedgerService(primaryPool);
const walletService = new WalletService(primaryPool);

app.use(express.json());

/**
 * Primary Health Check
 * Verifies connectivity to the regional write cluster.
 */
app.get("/health", async (req, res) => {
  try {
    await primaryPool.query("SELECT 1");
    res.json({
      status: "ok",
      cluster: "primary",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ status: "error", cluster: "primary", message: "unreachable" });
  }
});

/**
 * Secondary Health Check
 * Verifies connectivity to the cross-region Aurora Read Replica.
 */
app.get("/health/secondary", async (req, res) => {
  if (!secondaryPool) {
    return res.status(501).json({ status: "error", message: "Secondary replica not configured" });
  }

  try {
    await secondaryPool.query("SELECT 1");
    res.json({
      status: "ok",
      cluster: "secondary",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ status: "error", cluster: "secondary", message: "replica unreachable" });
  }
});

/**
 * Wallet Management Endpoints
 */

app.post("/marp/wallet/create", async (req, res) => {
  const { walletId, accountId, balance } = req.body;

  if (!walletId || !accountId) {
    return res.status(400).json({ error: "Missing required fields: walletId, accountId" });
  }

  try {
    const wallet = await walletService.createWallet(walletId, accountId, balance || 0);
    res.json(wallet);
  } catch (err: any) {
    console.error("[Wallet-Create-Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Wallet Balance Lookup
 * Note: Uses primaryPool via WalletService for read-after-write consistency.
 */
app.get("/marp/wallet/:accountId/:walletId", async (req, res) => {
  const { accountId, walletId } = req.params;

  try {
    const wallet = await walletService.getWallet(walletId, accountId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json(wallet);
  } catch (err: any) {
    console.error("[Wallet-Lookup-Error]", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * MARP Ledger Entry Endpoint
 * Atomically processes a charge or credit using the hardened DB function.
 */
app.post("/marp/ledger/create", async (req, res) => {
  const { accountId, walletId, amount, idempotencyKey, description, metadata } = req.body;

  const userContext = RequestContext.current;
  if (!userContext) {
    // This endpoint should ideally always be called within an authenticated context
    return res.status(401).json({ error: "Unauthorized: Missing user context" });
  }

  if (!accountId || !walletId || amount === undefined || !idempotencyKey) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Pass actor information from RequestContext to the LedgerService
  try {
    const result = await ledgerService.createEntry({
      accountId,
      walletId,
      amount,
      idempotencyKey,
      description,
      actorId: userContext.userId,
      actorRole: userContext.role,
      metadata
    });

    res.json(result);
  } catch (err: any) {
    console.error("[Ledger-Error]", err.message);
    const statusCode = err.message.includes("INSUFFICIENT_FUNDS") ? 402 : 500;
    res.status(statusCode).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[Billing-Engine] Active on port ${port}`);
});
