# MARP Billing Engine — Design Summary

Purpose
- Planetary-scale, governance-first billing engine for the Pulsco Global Ecosystem, governed by MARP and observed by CSI.

Core principles
- No hidden fees, no retroactive charges, no surprise renewals, no negative balances.
- MARP signs and versions all pricing/discount policies; CSI is advisory/read-only.
- User-visible charge rationale for every ledger entry: what, why, policy reference, region, and tax breakdown.

Architecture (high-level)
- Billing Orchestrator: central router responsible for calculating charges using a deterministic pipeline (Base → Regional Multiplier → Offers/Discounts → Tax) and stamping policy_version into the result.
- Policy Registry (MARP): signed policies with `policy_id`, `version`, `signed_by`, `effective_from`, `scope`, and `payload`.
- Per-Engine Billing Adapters: independent modules for E-Commerce, Matchmaking, Places, Communication, PAPv1, AI Programs, Localization. Each adapter calculates domain-specific pricing and emits billing requests.
- Wallet Service: single canonical wallet per account; enforces no-overdraft and auto-lock semantics; optional user-consented auto-top-up.
- Ledger Service: append-only, hash-linked ledger with `prev_hash` and `entry_hash` (SHA-256); ledger entries include policy provenance and discount provenance.
- Persistence: Postgres (primary). Migrations included to create policies, offers, wallets, ledger, merkle_roots, and audit_events tables.
- Reconciliation: periodic Merkle root computation stored in `merkle_roots` table for tamper-evident audit.

Policy & Governance
- MARP signs policies via pluggable KMS adapters (AWS KMS, Azure Key Vault, or HMAC dev fallback). Policies must include signatures when verifier is present.
- Policy selection uses `effective_from`/`effective_until` to prevent retroactive application.
- Rollbacks are possible via MARP policy registry and result in audit events; rollbacks do not retroactively change ledger entries—disputes and remediation processes apply.

Temporal Incentives
- Offers are time-scoped MARP policies: Founding Users (first 500 accounts, 20% subscription discount), Weekly Pulse Hours (2% across services), stacking capped at 22% for subscriptions.
- Offers are visible in UI and in ledger entries as discount provenance.

Audit & Integrity
- Ledger entries carry `prev_hash` and `entry_hash` (SHA-256 of canonical JSON). A Merkle root is computed periodically for long-term integrity and stored in `merkle_roots`.
- Disputes reference immutable ledger `entry_id` and are handled per MARP remediation policy.

Security
- KMS/HSM-backed policy signing for production; HMAC only for local development.
- Role-based access control: MARP signatories allowed to write policies; billing services have write access to ledger; CSI has read-only access to telemetry endpoints.

Developer notes
- The service `services/billing-engine` contains the Express server, Postgres persistence, migrations, and scripts for simulation and reconciliation.
