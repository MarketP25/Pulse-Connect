# PULSCO (Pulse Connect) Proximity Powerhouse vX100

Planetary-scale proximity foundation for Pulse Connect (PULSCO). Provides geocoding and distance primitives, region intelligence scaffolding, and clustering hooks used by other subsystems (marketing/PAP, matchmaking, intelligence core, edge).

This document reflects what is implemented in this repository and references exact code paths.

## Features

- Geocoding: Google Maps primary, OpenStreetMap fallback (integration points)
- Distance: Haversine distance calculations
- Region Intelligence: scaffolding for locale/currency/timezone inference
- Clustering: geohash/K‑means readiness (hooks for host services)
- Governance alignment: carry consent/purpose/policy metadata where applicable
- Caching: Redis read‑through (TODO; see implementation notes)

## Where the code lives

- Proximity primitives: services/proximity-power-house-vX100/src/proximity/proximity.service.ts
  - Implements Haversine distance and geocode flow (provider integration points)
  - Add Redis read‑through caching in this file (see TODO below)
- Shared types: shared/lib/src/types.ts (Geocode, ProximityRule, Distance request/response)
- PAP integration: pap_v1/marketing/proximityIntegration.ts (uses ProximityService, RegionIntelligence, AuditEngine)
- Adapter registry seed: infra/db-migrations/007_edge_gateway.sql (includes proximity‑geocoding adapter)

## Quick start

From repository root:

```bash
yarn install # or pnpm install (preferred for this workspace)
```

Service usage is package‑specific. Proximity is consumed by upstream services (e.g., PAP, Intelligence Core). Run tests from the monorepo root or targeted package scripts.

## Configuration

Environment variables used by proximity hosts:

- GOOGLE_MAPS_API_KEY
- REDIS_URL (planned for read‑through caching)

Downstream services attach governance headers (actor, purpose, policy version) and audit context as required by their own APIs.

## Usage (illustrative)

- Forward geocoding: POST /proximity/geocode
- Reverse geocoding: POST /proximity/reverse
- Distance: POST /proximity/distance
- Clustering: POST /proximity/cluster (if enabled by host)
- Health: GET /proximity/health
- Metrics: GET /proximity/metrics (if exposed by host)

Typical governance headers used by host services:
- x-actor-id
- x-subsystem
- x-purpose (e.g., delivery, fraud, marketing)
- x-request-id
- x-policy-version

## Architecture

- Provider layer: Google + OSM (router/fallbacks in host service)
- Computation layer: Haversine distance; travel time integration points
- Infrastructure layer: Redis caching (planned), audit/consent context propagation
- Governance layer: purpose‑based access and audit alignment enforced by hosts

## Performance

Targets depend on deployment. Aim for p95 ≤ 200ms for core calls with provider caching enabled. Use Redis read‑through to improve geocode hit ratios.

## Security & Compliance

- Carry purpose/policy metadata for consent‑aware processing
- Use shared hash chaining for tamper‑evident audits where hosts record proximity actions: @pulsco/shared-lib/hashChain
- Data minimization and regional awareness recommended at hosts

## Monitoring

- Health checks: provider status, cache connectivity (if used)
- Metrics: latency, cache hit ratio (if exposed by host service)

## Testing

Run tests from repo root:

```bash
pnpm test
```

Add service‑specific tests under each package (e.g., __tests__/ or src/**/tests).

## Deployment

Deployed by host services (Edge, Intelligence Core, or dedicated proximity service). Use Kubernetes resources and federation consistent with the wider ecosystem. See infra/k8s/* for examples.

## TODO (code��linked)

- Implement Redis read‑through caching in services/proximity-power-house-vX100/src/proximity/proximity.service.ts (geocode path). Define TTLs and key normalization.
- Add provider health scoring and fallback policy in host service.
- Emit Prometheus metrics from host service for latency and cache ratio.

## License

ISC (see repository).
