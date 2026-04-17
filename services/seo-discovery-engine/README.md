# SEO Discovery Engine

Production service for Pulsco global SEO + ASEO + GEO + LLMO operations.

## Purpose

This service operationalizes the planetary discovery loop:

`collect -> analyze -> generate -> optimize -> deploy -> monitor -> repeat`

CSI remains the intelligence brain:

- CSI analysis and scoring are computed every cycle.
- CSI recommendations and SEO directives are generated and persisted.
- CSI governance decisions are evaluated before deployment actioning.

## Endpoints

- `GET /health`
- `GET /ready`
- `GET /api/v1/seo/dashboard`
- `GET /api/v1/seo/cycles?limit=20`
- `GET /api/v1/seo/csi/latest`
- `POST /api/v1/seo/cycle/run` (internal token required)
- `POST /api/v1/seo/scheduler/pause` (internal token required)
- `POST /api/v1/seo/scheduler/resume` (internal token required)
- `POST /api/v1/seo/scheduler/run-once` (internal token required)

## Security

Privileged endpoints require `INTERNAL_SERVICE_TOKEN` via either:

- `x-internal-service-token`
- `Authorization: Bearer <token>`

## Required/Important Env

- `PORT` (default `3120`)
- `HOST` (default `0.0.0.0`)
- `INTERNAL_SERVICE_TOKEN`
- `SEO_AUTO_CYCLE_ENABLED` (default `true`)
- `SEO_CYCLE_INTERVAL_MS` (default `900000`)
- `SEO_CYCLE_STARTUP_JITTER_MS` (default interval/5)
- `SEO_CYCLE_ACTOR_ID` (default `seo-superadmin`)
- `SEO_STATE_FILE_PATH` (default `.pulsco/seo-control-center/state.json`)
- `SEO_HISTORY_LIMIT` (default `200`)
- `SEO_FEED_TIMEOUT_MS` (default `8000`)

Optional data feed URLs:

- `SEO_TRENDS_FEED_URL`
- `SEO_CSI_EVENTS_FEED_URL`
- `SEO_PROGRAMMATIC_FEED_URL`
- `SEO_PERFORMANCE_FEED_URL`
- `SEO_REFRESH_FEED_URL`
- `SEO_DELIVERY_FEED_URL`

## Run

```bash
pnpm --filter @pulsco/csi build
pnpm --filter @pulsco/aseo-core build
pnpm --filter @pulsco/aseo-content-engine build
pnpm --filter @pulsco/programmatic-seo build
pnpm --filter @pulsco/seo-schema-engine build
pnpm --filter @pulsco/aseo-csi-adapter build
pnpm --filter @pulsco/seo-realtime-engine build
pnpm --filter @pulsco/content-refresh-engine build
pnpm --filter @pulsco/gso-delivery-engine build
pnpm --filter @pulsco/linking-engine build
pnpm --filter @pulsco/authority-engine build
pnpm --filter @pulsco/seo-control-center build
pnpm --filter @pulsco/seo-discovery-engine build
pnpm --filter @pulsco/seo-discovery-engine start
```
