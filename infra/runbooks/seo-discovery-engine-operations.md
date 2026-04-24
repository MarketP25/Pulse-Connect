# SEO Discovery Engine Operations Runbook

## Objective

Keep Pulsco globally discoverable across search engines, AI answer systems, and voice ecosystems using CSI-led automation.

## Components

- `services/seo-discovery-engine`
- `packages/seo-control-center`
- `packages/csi` (analysis, scoring, recommendations, directives, governance)
- `infra/k8s/seo-discovery-engine-deployment.yaml`
- Redis state backend via `SEO_REDIS_URL` (preferred for multi-replica safety)

## Deploy

1. Build and publish `planetary/seo-discovery-engine:latest`.
2. Apply manifests:
   - `kubectl apply -f infra/k8s/seo-discovery-engine-deployment.yaml`
3. Confirm health:
   - `kubectl -n planetary-pulse get pods -l app=seo-discovery-engine`
   - `kubectl -n planetary-pulse get cronjob seo-discovery-cycle-trigger`

## Runtime Checks

- Health: `GET /health`
- Readiness: `GET /ready`
- Latest dashboard: `GET /api/v1/seo/dashboard`
- CSI output: `GET /api/v1/seo/csi/latest`
- GSO linkage output: `GET /api/v1/seo/gso/latest`

## Manual Cycle Trigger

```bash
curl -X POST \
  -H "x-internal-service-token: $INTERNAL_SERVICE_TOKEN" \
  -H "content-type: application/json" \
  --data '{"cycleId":"manual-<timestamp>"}' \
  http://seo-discovery-engine/api/v1/seo/cycle/run
```

## Incident Actions

- Pause scheduler writes:
  - `POST /api/v1/seo/scheduler/pause`
- Resume scheduler writes:
  - `POST /api/v1/seo/scheduler/resume`
- Inspect CSI governance decisions in latest cycle payload.

## Security

- All mutation routes require `INTERNAL_SERVICE_TOKEN`.
- Production requires token configured, or requests are blocked.

## Data Integrity

- If `SEO_REDIS_URL` is configured, cycles and lock state are distributed via Redis.
- If Redis is not configured, state file fallback is written atomically using temp-file rename.
- CSI intelligence, directives, and governance decisions are persisted each cycle.
