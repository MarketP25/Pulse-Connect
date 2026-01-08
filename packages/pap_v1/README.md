# PULSCO (Pulse Connect) — Pulse Agent Protocol (PAP) v1

PAP v1 is PULSCO (Pulse Connect)’s proximity‑aware marketing automation add‑on. It integrates with PULSCO governance and proximity services, enforcing consent and audit across automated campaigns.

## Overview

Core capabilities implemented in this repository:
- Consent and entitlement gates for policy‑driven marketing
- Purpose‑based consent and immutable auditing for all actions
- Channel connectors (email/SMS/social) with policy checks
- Localization support for creative/template variants
- Spend controls with safe rollback patterns
- Eventing and idempotency for reliable delivery

PAP integrates PULSCO proximity intelligence:
- pap_v1/marketing/proximityIntegration.ts references:
  - ProximityService for geospatial operations
  - RegionIntelligence for region/timezone/currency inference
  - AuditEngine for purpose‑bound audit logging

These are imported from Pulse Connect Core proximity services to generate proximity insights, clustering, and time‑zone aware recommendations.

## Architecture

- Consent Engine: per‑channel scopes, expiry, revocation
- Entitlement Engine: subscription/usage caps, deny‑by‑default
- Policy Engine: subscription → consent → caps → quiet hours → safety
- Action Executor: connector invocation with spend tracking
- Connectors: Email/SMS/Social with policy‑aware execution
- Templates: localization, accessibility, brand safety checks
- Spend Controls: auto‑pause, rollback
- Eventing: transactional outbox, idempotency keys, DLQ
- Observability: deliverability, throttles, pacing, fairness index
- Audit: append‑only audit with hash‑chaining via shared lib
- Proximity Integration: clustering and regional insights for targeting

## Database Schema (high‑level)

- accounts — user accounts
- consent_ledger — consent records and snapshots
- subscriptions_* — PAP subscription and entitlements
- subscription_usage_pap — usage tracking
- pap_actions/pap_events — actions and event logs
- audience_registry — audience management

## API Endpoints (illustrative)

- /consent — consent management
- /pap/subscription — subscription management
- /pap/decision — policy decisions
- /pap/send — send actions
- /pap/audience — audience management
- /pap/social, /pap/email, /pap/sms — channel actions
- /pap/metrics — analytics and metrics

## Installation & Development

This repository uses pnpm workspaces.

- Install dependencies from repo root:
  - pnpm install
- Start PAP (if a workspace script exists):
  - pnpm dev:pap
- Or run from this package directory:
  - pnpm install
  - pnpm dev (if defined)

Configure environment according to your connectors and database; align consent/audit endpoints with MARP governance perimeter where applicable.

## Usage Flow

1) Subscribe → 2) Activate PAP → 3) Grant consent → 4) Execute actions (policy‑checked) → 5) Monitor → 6) Audit

Policy decision flow:

Check subscription → Validate consent → Check caps → Apply quiet hours → Content safety → Select channel → Return decision

## Compliance

- GDPR, CCPA, UK DPA, Kenya DPA
- Consent ledger snapshots, audit trails, data retention policies
- Right to erasure support

## Testing

- Run tests from repo root or this package: pnpm test
- Include consent/entitlement/caps/quiet hours/connector tests and rollback scenarios

## Runbooks

- runbooks/activation-runbook.md
- runbooks/pause-cancel-runbook.md
- runbooks/incident-escalation-runbook.md
- runbooks/spend-anomaly-runbook.md

## Development Structure (high‑level)

Pulse-Agent-Protocol/
- consent/           — Consent engine
- entitlements/      — Entitlement engine
- connectors/        — Channel connectors
- templates/         — Template system
- spend/             — Spend controls
- audit/             — Audit logs
- events/            — Eventing system
- observability/     — Dashboards
- runbooks/          — Operational guides
- tests/             — Test suites
- workers/           — Background workers
- engine/            — Action executor
- logic/             — Core logic
- marketing/         — Proximity integration (see proximityIntegration.ts)

## Terminology

- PULSCO == Pulse Connect (abbreviation)
- PAP == Pulse Agent Protocol (marketing automation)

## License

ISC (see license in repository if present).