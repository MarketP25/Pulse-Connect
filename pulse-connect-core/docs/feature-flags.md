# Feature Flags

This document describes runtime feature flags for Pulsco.

Environment-driven flags:
- `FEATURE_KYC_AUTO_DECISION` — if set to `true` or `1`, enables AI auto-decisions for KYC submissions where `ComplianceService` checks `isFeatureEnabled('KYC_AUTO_DECISION')`.

Runtime admin API (Pulse Intelligence service):
- GET `/admin/feature-flags` — list known flags and values (reads Redis if configured).
- POST `/admin/feature-flags/:name` { enabled: true|false } — set a flag at runtime (writes to Redis when available and in-process memory).

Notes:
- For production, configure `REDIS_URL` to enable cross-process flag propagation.
- For safety, always start with env var disabled and enable via the admin API or CI/CD release plan when testing.
