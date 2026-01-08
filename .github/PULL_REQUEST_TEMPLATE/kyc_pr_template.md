## Summary

Short description of the KYC/compliance changes and purpose.

## Changes
- DB migration: `infra/db-migrations/001_initial_schema.sql` (kyc_verifications, compliance_events, compliance_audit_log, sellers columns)
- Compliance API endpoints and router
- AI automation wiring (AI decision client + evaluate endpoint)
- Runtime feature flags and admin endpoints
- Seller and admin UI stubs for KYC flows
- Scheduler and CronJob manifest for expiry
- Unit tests for ComplianceService

## Checklist
- [ ] Run DB migrations in staging
- [ ] Provision Redis for runtime feature flags
- [ ] Run unit tests: `pnpm --filter ... test` or `pnpm -w test`
- [ ] Run integration/E2E tests (if available)
- [ ] Confirm observability hooks and alerts

## Notes
- Migration is additive and safe for existing data; confirm `sellers` table exists in target DB.
- Feature gated: `KYC_AUTO_DECISION` environment flag and runtime flag controls auto-decisions.
