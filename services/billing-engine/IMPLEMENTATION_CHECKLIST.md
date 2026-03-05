- [x] Create Policy Registry with MARP verification scaffold
- [x] Implement Wallet Service (no overdraft, auto-lock)
- [x] Implement Ledger Service (append-only, hash-linked entries)
- [x] Add per-engine billing adapters (E-Commerce, Matchmaking, Places, Communication, PAPv1, AI, Localization)
- [x] Add Orchestrator with charge pipeline (Base→Multiplier→Discount→Tax)
- [x] Add Postgres persistence and migrations (001, 002)
- [x] Add reconciliation job (Merkle root snapshots)
- [x] Add pluggable KMS (AWS KMS, Azure Key Vault adapters, HMAC fallback)
- [x] Build minimal Express server with MARP-branded endpoints
- [x] Add simulation script and sample tests
- [ ] Harden production schema and constraints (indexes, FK, partitions)
- [ ] Integrate HSM/KMS and remove HMAC fallback in production
- [ ] Add observability: telemetry stream to CSI and read-only advisory endpoints
- [ ] Implement dispute resolution workflow and UI flows
- [ ] Full e2e tests with Postgres and KMS in CI

Next short-term engineering steps:
1. Decide whether JSON fallback is allowed in dev or Postgres should be mandatory.
2. Wire up KMS credentials (MARP_AWS_KMS_KEY_ID or MARP_AZURE_*) for signed policies.
3. Create UI notices and renewal email templates referencing `policyId@version`.
4. Add payment gateway integration for initial signup charges and optional auto-top-up.
