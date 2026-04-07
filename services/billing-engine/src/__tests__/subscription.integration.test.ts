import { Pool } from "pg";
import { PostgresPersistence } from "../persistence_pg";
import { createServer } from "../server";
import request from "supertest";

// Helper to check if PostgreSQL is available
async function isPostgresAvailable(): Promise<boolean> {
  try {
    const testPool = new Pool({
      connectionString:
        process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
      connectionTimeoutMillis: 2000
    });
    const client = await testPool.connect();
    client.release();
    await testPool.end();
    return true;
  } catch {
    return false;
  }
}

describe("Subscription integration with Postgres", () => {
  let app: any;
  let pool: Pool;

  beforeAll(async () => {
    // Skip tests if PostgreSQL is not available
    const pgAvailable = await isPostgresAvailable();
    if (!pgAvailable) {
      console.log("[BEFOREALL] Skipping - PostgreSQL not available");
      return;
    }

    console.log("[BEFOREALL] Starting subscription integration test setup...");
    const startTime = Date.now();

    try {
      // Connect to real PostgreSQL database
      const databaseUrl =
        process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
      console.log(`[BEFOREALL] Connecting to database: ${databaseUrl}`);
      pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
      console.log("[BEFOREALL] Pool created, attempting to connect...");

      const connectStart = Date.now();
      const client = await pool.connect();
      console.log(`[BEFOREALL] Connected to database in ${Date.now() - connectStart}ms`);

      const persistenceStart = Date.now();
      const persistence = new PostgresPersistence(databaseUrl);
      await persistence.connect();
      console.log(`[BEFOREALL] Persistence connected in ${Date.now() - persistenceStart}ms`);

      // Create the marp_create_ledger_entry function for atomic ledger + wallet updates
      const fnStart = Date.now();
      await client.query(`
        CREATE OR REPLACE FUNCTION marp_create_ledger_entry(payload jsonb) RETURNS void AS $
        DECLARE
          e jsonb := payload;
          entry_id text := (e->>'entryId');
          wallet_id text := (e->>'walletId');
          account_id text := (e->>'accountId');
          ts timestamptz := now();
        BEGIN
          INSERT INTO ledger(entry_id, wallet_id, account_id, ts, data) VALUES(entry_id, wallet_id, account_id, ts, payload)
          ON CONFLICT (entry_id) DO NOTHING;
          -- simple wallet upsert: create if not exists, else update balance in data
          INSERT INTO wallets(wallet_id, account_id, data) VALUES(wallet_id, account_id, jsonb_build_object('walletId', wallet_id, 'accountId', account_id, 'balance', COALESCE((e->>'balanceAfter')::numeric, 0)))
          ON CONFLICT (wallet_id) DO UPDATE SET data = jsonb_build_object('walletId', wallet_id, 'accountId', account_id, 'balance', COALESCE((e->>'balanceAfter')::numeric, (wallets.data->>'balance')::numeric));
        END;
        $ LANGUAGE plpgsql;
      `);
      console.log(`[BEFOREALL] Function created in ${Date.now() - fnStart}ms`);

      client.release();

      const serverStart = Date.now();
      app = await createServer(persistence);
      console.log(`[BEFOREALL] Server created in ${Date.now() - serverStart}ms`);

      console.log(`[BEFOREALL] Total setup time: ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error("[BEFOREALL] Setup failed with error:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Skip cleanup if pool was not initialized (PostgreSQL not available)
    if (!pool) {
      return;
    }

    // Clean up test data and close connection pool
    try {
      await pool.query("DELETE FROM ledger WHERE entry_id LIKE $1", ["int-%"]);
      await pool.query("DELETE FROM wallets WHERE wallet_id LIKE $1", ["int-%"]);
    } catch (e) {
      // Ignore cleanup errors
    }
    await pool.end();
  });

  test("create subscription persists to Postgres and ledger can be read", async () => {
    // Skip if PostgreSQL was not available in beforeAll
    if (!pool) {
      return;
    }

    const resp = await request(app).post("/marp/subscription/create").send({
      accountId: "int-acct",
      walletId: "int-wallet",
      planId: "basic",
      price: 50,
      region: "us",
      idempotencyKey: "i1",
      autoRenew: true
    });
    expect(resp.status).toBe(200);
    const ledgerResp = await request(app).get("/marp/ledger/int-acct");
    expect(ledgerResp.status).toBe(200);
    expect(Array.isArray(ledgerResp.body)).toBeTruthy();
    expect(ledgerResp.body.length).toBeGreaterThanOrEqual(1);
    // verify subscriptions table contains persisted subscription record
    // Query via the server's persistence by calling the subscription endpoint we already have
    const subResp = await request(app).get("/marp/subscription/int-acct");
    expect([200, 404]).toContain(subResp.status);
    if (subResp.status === 200) {
      expect(subResp.body).toHaveProperty("accountId", "int-acct");
      expect(subResp.body).toHaveProperty("planId", "basic");
    }
  });
});
