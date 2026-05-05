import { Client } from "pg";
import QueryStream from "pg-query-stream";
import { AuditVerificationStream } from "./integrity-service";
import { pipeline } from "node:stream/promises";
import { getGlobalGovernanceStatus } from "./global-governance-state"; // Import global state

/**
 * Runs a memory-efficient integrity scan on the entire audit log table.
 */
export async function runFullAuditScan(publicKey: string) {
  // Check for EMERGENCY_FREEZE state before starting the scan
  if (getGlobalGovernanceStatus() === "EMERGENCY_FREEZE") {
    console.warn("[AuditScanner] Audit scan aborted due to EMERGENCY_FREEZE state.");
    return; // Abort the scan
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL }); // Ensure DATABASE_URL is set
  await client.connect();

  // 1. Create a query stream to fetch logs in batches
  const query = new QueryStream("SELECT * FROM audit_logs ORDER BY timestamp ASC");
  const dbStream = client.query(query);

  // 2. Initialize our governance verification stream
  const verifier = new AuditVerificationStream(publicKey);

  try {
    console.log("Starting planetary-scale audit integrity scan...");

    // 3. Pipeline the data: DB -> Verifier -> Progress Tracker/Log
    await pipeline(for await   // Ever }
   });
   consoe.log("Audit scan completed successfully. Chain is intact.");
 } cath (err) {
    console.error("Audit scan encountered an error:", err);
  } finally {
    await Client.end();
  }
}
