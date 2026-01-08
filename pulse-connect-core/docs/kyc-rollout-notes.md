# KYC Rollout & Deployment Notes

Summary:
- New KYC flow added with `ComplianceService` handling submissions, reviews, and expiry.
- DB migration: `003_kyc_schema.sql` creates `kyc_verifications`, `compliance_events`, and adds seller columns.
- Feature flag: `FEATURE_KYC_AUTO_DECISION` (env boolean) enables AI auto-decisions. Also manageable at runtime via the admin API `/admin/feature-flags`.

Deployment Checklist:
- Apply DB migrations in staging and production before enabling features.
- Provision Redis (set `REDIS_URL`) to use runtime feature flags across services.
- Start `pulse-hosting-backend` and ensure `/api/kyc/*` endpoints are reachable.
- Deploy CronJob `infra/k8s/cronjobs/expire-kyc-cronjob.yaml` or rely on the in-app scheduler (controlled via `ENABLE_KYC_SCHEDULER=true`).
- Monitor `compliance_events` table and logs for anomalies after rollout.

Testing:
- Enable `FEATURE_KYC_AUTO_DECISION` in staging and run full integration tests.
- Test admin UI review flow and revoke feature flags if unexpected mass approvals occur.
