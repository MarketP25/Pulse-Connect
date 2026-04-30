# Global Production Readiness Strategy (2026-04-01)

## Current Verification Result

- Dashboard/API build and lint pass for `pulse-connect-ui`.
- Service builds pass for `admin-gateway-service`, `edge-gateway`, and `billing-engine`.
- Emergency protocol fan-out is wired from admin-gateway to edge+billing.
- Trusted dashboard identity propagation is active via middleware + auth cookies.
- Localization translation path is now internal-first: Localization API -> CSI -> local fallback.
- Dashboard onboarding now accepts any valid ISO language code and is no longer limited to a short static list.

## What Is Production-Ready Now

1. Emergency governance distribution path
- Admin mutates emergency protocol -> fan-out event -> edge+billing ingest endpoint -> runtime enforcement.

2. Dashboard authentication context
- Production dashboard requests resolve user identity from trusted headers/cookies, not query-only identity.

3. Internal translation architecture
- Internal localization and CSI are primary providers.
- External provider usage is opt-in only (`ALLOW_EXTERNAL_TRANSLATION_PROVIDER=true`).

## Gaps Still Requiring Global Hardening

1. Secrets management maturity
- Current k8s manifest uses base64-encoded values in config. This is not sufficient for enterprise production security.
- Required upgrade: sealed-secrets / external secrets operator + KMS-backed secret source.

2. 1000+ language operational guarantee
- UI now accepts unlimited ISO codes and merges Localization+CSI coverage, but guaranteed quality for 1000+ languages requires backend model/dataset rollout.

3. Full visual QA matrix
- Build-level verification passes, but global UI readiness still needs browser/device matrix validation (mobile webviews, tablets, desktop, low-bandwidth).

4. Typography consistency cleanup
- Some legacy localization components include encoding artifacts and should be normalized as part of visual quality hardening.

## Phase 1-3 Execution Plan

## Phase 1.Stabilize

1. Move all runtime secrets to managed secret backends
- Adopt External Secrets Operator or sealed-secrets for `planetary-secrets`.
- Rotate `INTERNAL_SERVICE_TOKEN` after migration.

2. Add global UI quality gates
- Add Playwright visual regression for key pages: `/`, `/dashboard`, `/dashboard/partner`, `/dashboard/investor`.
- Enforce mobile breakpoints: `320`, `390`, `768`, `1024`, `1440`.

3. Add translation reliability SLOs
- Track Localization+CSI translation success %, p95 latency, and fallback ratio.

## Phase 2.Scale

1. Expand localization registry to 1000+ codes server-side
- Source from internal language registry in localization domain.
- Expose paginated `/languages` with quality tiers and region coverage.

2. CSI-assisted language routing
- Use CSI to recommend best provider route by region, quality, and cost.

3. Dashboard UX for large language catalogs
- Replace static pickers with searchable virtualized language selector using server pagination.

## Phase 3.Global Certify

1. Launch regional production canaries
- 3-region staged rollout with emergency fan-out drills.

2. Complete accessibility + responsiveness certification
- WCAG audit + keyboard navigation + zoom support + RTL validation.

3. Backlog closure governance
- Convert remaining partial items in `dashboard-gap-backlog.md` to release milestones with owner/date/SLO.

## Success Criteria

- Emergency fan-out propagation < 5s p95 across regions.
- Dashboard auth bypass incidents = 0.
- Internal translation coverage >= 1000 language codes with published quality tiers.
- Fallback translation ratio < 5% for top 95% active locales.
- Responsive/visual regression pass rate >= 99% across target matrix.
