# PULSCO (Pulse Connect)

Planetary-scale proximity and governance platform integrating multiple subsystems (ecommerce, places/venues, marketing/PAP, geocoding, AI/chatbot, communication, localization, translations, fraud, matchmaking) under a MARP-governed edge. This document reflects the implementation in this repository and clarifies that “PULSCO” is an abbreviation of “Pulse Connect.”


## What is PULSCO (Pulse Connect)

PULSCO (Pulse Connect) is a privacy- and governance-first platform that:
- Enforces signed policies and immutable audits around every subsystem action (MARP governance perimeter + Edge Gateway).
- Provides proximity/location intelligence (geocoding, distance, clustering foundations) and planetary load balancing.
- Integrates domain subsystems through adapters registered at the edge (internal and third‑party).
- Uses shared security controls (PC365 dual control) and tamper‑evident audit chains.


## Architecture (from the code)

Concentric design implemented across these major layers:

- MARP Governance Perimeter + Edge Gateway
  - Governance core and firewall gateway protect subsystem calls and decisions.
    - services/marp-governance-core
    - services/marp-firewall-gateway
    - tests/marp-integration.test.ts (e2e governance + firewall tests)
  - Edge adapter registry and immutable audit/event tables.
    - infra/db-migrations/007_edge_gateway.sql
    - Adapters seeded: ecommerce, payments, fraud, proximity-geocoding, communication, marketing, places, chatbot, ai-programs
  - Operations runbook (planetary scaling, key rotation, SLO checks).
    - infra/runbooks/edge-gateway-operations.md

- Pulse Intelligence Core (planetary routing and decisioning)
  - Global load balancing, regional health, proximity/latency scoring, failover and redistribution.
    - services/pulse-intelligence-core/src/global-load-balancer/global-load-balancer.service.ts
    - services/pulse-intelligence-core/src/global-speed/global-speed.service.ts
  - Decision/audit/policy/transactions domains with explainability hooks.
    - services/pulse-intelligence-core/src/decisions/*
    - services/pulse-intelligence-core/src/policies/*
    - services/pulse-intelligence-core/src/transactions/*
  - Domain features
    - Matchmaking: services/pulse-intelligence-core/src/matchmaking/matchmaking.controller.ts
    - Chatbot/AI: services/pulse-intelligence-core/src/chatbot/*, src/ai-engine/*, src/cognitive-computing/*, reporting-engine

- Proximity Powerhouse (core proximity primitives)
  - Geocoding and Haversine distance foundations.
    - services/proximity-power-house-vX100/src/proximity/proximity.service.ts
  - Shared types for Geocode/ProximityRule/Distance and cross‑service contracts.
    - shared/lib/src/types.ts

- PAP v1 (Proximity‑aware Marketing)
  - PAP proximity integration combines ProximityService, RegionIntelligence, and AuditEngine for campaign targeting and insights.
    - pap_v1/marketing/proximityIntegration.ts

- Communication Wallet & Billing (minutes-based voice/video)
  - Fee policy, wallet balances, billing transactions, regional FX pricing, auto top‑up, ledger recording.
    - pulse-connect-core/src/communication/services/wallet-integration.service.ts
  - Payment and FX calls are integration points; current code stubs these with placeholders.

- Shared Security and Audit
  - PC365 dual control for sensitive operations.
    - shared/lib/src/pc365Guard.ts
  - Hash chaining for tamper‑evident audit trails.
    - shared/lib/src/hashChain.ts


## Monorepo structure (selected)

- pulse-connect-core: Core services including communication wallet billing and proximity integrations.
- pulse-connect-ui, pulse-connect-admin-ui: Next.js UIs (user/admin) with localization support.
- services/*: Intelligence core, edge gateway, governance, observability, firewall, reporting, proximity powerhouse.
- pap_v1: Pulse Agent Protocol v1, with proximity-aware marketing integration.
- infra/*: DB migrations, K8s manifests, monitoring, CI/CD, and operational runbooks.
- shared/lib: Security/audit primitives and shared types.


## Development

Prerequisites
- Node.js >= 18
- pnpm >= 8

Install and run
- pnpm install
- pnpm dev        # start primary apps/services per workspace scripts
- pnpm test       # run tests across packages
- pnpm lint       # lint all packages

Notes
- Some services run independently (e.g., pulse-intelligence-core on 3001 per logs). Use package-level README or scripts for specific ports.
- Kafka may be required for streaming features referenced by chatbot and planetary health emissions; configure KAFKA_URL if used in your setup.


## Configuration and environment

Common variables (examples; check each service for its env contract):
- Database: DATABASE_URL or service-specific TypeORM settings
- Governance: MARP public key versions and policy endpoints
- Edge: adapter registry DB and audit sink
- Caching: Redis (planned for proximity geocoding cache)
- Messaging: KAFKA_URL for streaming health/alerts (if enabled)
- UI/Auth: NEXTAUTH_* (in UI packages)


## Operational runbooks (code-aligned)

- Edge Gateway operations: infra/runbooks/edge-gateway-operations.md
  - MARP signature rotation, adapter health checks, planetary scaling (replicas), resource tuning, rollout and recovery.


## Current status and planned work (code-aligned TODOs)

The following items are reflected directly in the source and should be implemented to complete the ecosystem:

- Proximity caching (Redis read-through)
  - Implement Redis client and cache policy in services/proximity-power-house-vX100/src/proximity/proximity.service.ts (geocode path).

- Payment and FX integrations for communication billing
  - Replace placeholders in pulse-connect-core/src/communication/services/wallet-integration.service.ts with real payment gateway and FX provider clients.
  - Ensure idempotency keys per trace_id; reconcile ledger with gateway webhooks.

- Governance observability and SLOs
  - Expand infra/db-migrations/006_marp_observability.sql and related dashboards to surface audit completeness, snapshot distribution, and signature verification SLOs in monitoring/.

- Adapter registry lifecycle
  - Promote adapter registry (infra/db-migrations/007_edge_gateway.sql) to a managed API for register/update/deprecate, with policy-scoped capabilities and health signaling.

- NLP and cognitive computing hardening
  - Replace keyword-based NLP in services/pulse-intelligence-core/src/ai-engine/* with model-backed pipelines (local or hosted), add content safety filters, and capture explanations in audit context.

- Matchmaking enrichment
  - Extend services/pulse-intelligence-core/src/matchmaking with region-aware filters, skill/capability vectors, and proximity tiers; wire to global load balancer for edge-aware placement.

- Localization and translations
  - Align UI packages’ localization scaffolding with centralized catalogs; complete TODOs in TODO-localization-engine.md after code updates.


## Testing

- pnpm test               # run all tests
- tests/marp-integration.test.ts validates governance and firewall flows
- Add service-specific tests under each package’s __tests__ or src/**/tests directories.


## Security and compliance

- All critical actions should use PC365 dual control.
- All decisions and transactions should produce append-only, hash-chained audit logs with policy/version context.
- Enforce consent/purpose flags at call sites (marketing, fraud, communications) and capture in audits.


## Terminology

- PULSCO == Pulse Connect (abbreviation).
- MARP: Market Arbitration/Review Policies (governance perimeter and edge firewall in this repo).
- Edge Gateway: Global execution surface enforcing MARP, routing to subsystem adapters.
- Pulse Intelligence Core: Decisioning, global load balancing, planetary health.
- Proximity Powerhouse vX100: Proximity primitives (geocoding/distance) and future clustering/caching.


## License

ISC (see LICENSE if present in this repository).


## Acknowledgments

This repository implements a governance-first, planetary architecture for Pulse Connect (PULSCO). Claims in this README are aligned with the current codebase; integration points (payments, FX, Redis caching, model-backed NLP) are intentionally marked for implementation.
