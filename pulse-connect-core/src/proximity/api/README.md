# PULSCO (Pulse Connect) — Proximity API

Central API surface for geocoding, proximity calculations, and region intelligence used across Pulse Connect (PULSCO). This document reflects the implemented primitives and their usage by other packages (e.g., PAP marketing integration and Intelligence Core).

## What this provides
- Forward/Reverse geocoding endpoints
- Distance calculations (Haversine)
- Clustering hooks (geohash/K-means readiness)
- Health/metrics surfaces as exposed by the hosting service

Implementation notes:
- Core proximity primitives live in services/proximity-power-house-vX100/src/proximity/proximity.service.ts
- Shared types live in shared/lib/src/types.ts
- Upstream services (e.g., pap_v1/marketing/proximityIntegration.ts) import proximity functions and attach consent/audit context where required

## Endpoints (illustrative)
- POST /proximity/geocode — forward geocoding
- POST /proximity/reverse — reverse geocoding
- POST /proximity/distance — distance between two coordinates
- POST /proximity/cluster — clustering (if enabled by host)
- GET  /proximity/health — health check
- GET  /proximity/metrics — metrics (if enabled by host)

Headers (typical where governance applies):
- x-actor-id, x-subsystem, x-purpose, x-request-id, x-policy-version

## Development
- Run tests from repo root: `pnpm test`
- Service-specific tests may exist under package `__tests__` or `src/**/tests`

## Related code
- services/proximity-power-house-vX100/src/proximity/proximity.service.ts (geocoding/Haversine)
- pap_v1/marketing/proximityIntegration.ts (PAP proximity integration)
- shared/lib/src/types.ts (Geocode, ProximityRule, Distance types)
- infra/db-migrations/007_edge_gateway.sql (adapter registry seeds include proximity-geocoding)
