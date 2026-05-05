"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFullAuditScan = runFullAuditScan;
const pg_1 = require("pg");
const pg_query_stream_1 = __importDefault(require("pg-query-stream"));
const integrity_service_1 = require("./integrity-service");
const promises_1 = require("node:stream/promises");
const global_governance_state_1 = require("./global-governance-state"); // Import global state
/**
 * Runs a memory-efficient integrity scan on the entire audit log table.
 */
async function runFullAuditScan(publicKey) {
    // Check for EMERGENCY_FREEZE state before starting the scan
    if ((0, global_governance_state_1.getGlobalGovernanceStatus)() === "EMERGENCY_FREEZE") {
        console.warn("[AuditScanner] Audit scan aborted due to EMERGENCY_FREEZE state.");
        return; // Abort the scan
    }
    const client = new pg_1.Client({ connectionString: process.env.DATABASE_URL }); // Ensure DATABASE_URL is set
    await client.connect();
    // 1. Create a query stream to fetch logs in batches
    const query = new pg_query_stream_1.default("SELECT * FROM audit_logs ORDER BY timestamp ASC");
    const dbStream = client.query(query);
    // 2. Initialize our governance verification stream
    const verifier = new integrity_service_1.AuditVerificationStream(publicKey);
    try {
        console.log("Starting planetary-scale audit integrity scan...");
        // 3. Pipeline the data: DB -> Verifier -> Progress Tracker/Log
        await (0, promises_1.pipeline)();
        for (; ; )
            ; // Ever }
    }
    finally { }
    ;
    consoe.log("Audit scan completed successfully. Chain is intact.");
}
cath(err);
{
    console.error("Audit scan encountered an error:", err);
}
try { }
finally {
    await pg_1.Client.end();
}
