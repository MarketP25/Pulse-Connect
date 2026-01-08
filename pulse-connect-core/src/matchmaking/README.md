# PULSCO (Pulse Connect) — Matchmaking

Proximity-powered matchmaking for Pulse Connect (PULSCO). This service uses geospatial inputs and contextual preferences to return candidate matches, aligning with planetary routing in the Pulse Intelligence Core and governance via MARP.

This document reflects implemented code and points to exact files.

## What’s implemented

- Geospatial search endpoint (illustrative controller):
  - services/pulse-intelligence-core/src/matchmaking/matchmaking.controller.ts
    - POST /matchmaking/geospatial-search: accepts { userId, preferences, location }
    - Returns candidates with proximity-driven features (e.g., distance, estimated time)

- Planetary routing context:
  - services/pulse-intelligence-core/src/global-load-balancer/global-load-balancer.service.ts
    - Geographic proximity scoring, latency estimates, failover candidates
  - services/pulse-intelligence-core/src/global-speed/global-speed.service.ts
    - Haversine-based distance and latency predictions

- Governance perimeter:
  - MARP Governance Core and Firewall Gateway are tested in tests/marp-integration.test.ts
  - All calls should include purpose/actor/policy metadata and be auditable

## Example API (illustrative)

POST /matchmaking/geospatial-search
Content-Type: application/json

{
  "userId": "user_123",
  "preferences": { "radiusKm": 10, "interests": ["fitness", "outdoors"] },
  "location": { "lat": -1.286389, "lng": 36.817223 }
}

Response (example):
{
  "candidates": [
    {
      "id": "cand_001",
      "score": 0.92,
      "distanceKm": 5.2,
      "estimatedTimeMin": 12,
      "factors": ["skill_match", "location_proximity", "availability"]
    }
  ]
}

## Headers (when governed)

- x-actor-id
- x-subsystem: matchmaking
- x-purpose (e.g., discovery)
- x-request-id
- x-policy-version

## Development

Run from repository root:

- Install: pnpm install
- Dev (package-specific): pnpm dev (if defined)
- Tests: pnpm test

Check package.json in the relevant service directory for exact scripts.

## Integration points

- Proximity primitives: services/proximity-power-house-vX100/src/proximity/proximity.service.ts
- Global routing: services/pulse-intelligence-core/src/global-load-balancer/global-load-balancer.service.ts
- Governance tests: tests/marp-integration.test.ts

## Monitoring and SLOs (deployment dependent)

- p95 latency targets for geospatial search
- Error rate thresholds
- Regional distribution and failover success rate

## Security and audit

- Capture purpose/actor/policy in audit logs
- Use shared hash chaining where applicable (@pulsco/shared-lib/hashChain)
- Enforce consent boundaries when proximity data is used for matching

## TODO (code-aligned)

- Enrich scoring with proximity tiers and contextual attributes
- Add eligibility and fairness rules consistent with MARP policies
- Integrate selection with the global load balancer for regional placement
- Add performance tests for geospatial workloads

## License

ISC (see repository)
