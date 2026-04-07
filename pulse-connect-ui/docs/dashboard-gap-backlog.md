# Dashboard Gap Backlog (Post-Audit)

## Goal

Track capabilities that exist in PULSCO platform services but are not yet available in the current user dashboard.

## Current Dashboard Surface (Already Available)

- APIs: `bootstrap`, `onboarding`, `profile`, `subscription`, `kyc`, `ecommerce`, `insights`, `places`, `communication`, `marketing`, `security`, `interactions`, `ops`, `localization`
- UI panels: onboarding, profile, subscription, ecommerce, insights, places, communication, marketing, security, operations

## Gap Summary

The dashboard currently exposes 19 handlers, while significantly more capability already exists across `pulse-connect-core`, `services/*`, and `packages/*`.

High-impact missing areas:

- Reporting and fraud analytics UI/API surface
- Real identity/auth lifecycle integration
- Real KYC orchestration and reviews
- Advanced billing/subscription controls and ledger views
- Full places marketplace and booking operations
- Full matchmaking contracts/proposals/milestones flows
- Real-time communication channels and channel connectors
- Advanced localization/proximity operations
- CSI governance approval workflow exposure
- MARP observability/governance/arbitration visibility

## P0 (Critical Parity, Compliance, Trust)

1. Reporting + fraud module exposure
- Why: `reporting` exists in access model but has no dashboard module implementation.
- Integrate:
  - `services/reporting-engine/src/reporting/reporting.controller.ts`
  - `services/reporting-engine/src/fraud/fraud.controller.ts`
- Deliver:
  - New API routes: `api/dashboard/reporting` and `api/dashboard/fraud`
  - New `ReportingPanel` with revenue summary/trends, latency, anomalies, risk score
  - Tier/role gates aligned with existing `reporting` access rules
- Acceptance:
  - Organisation role can access reporting
  - Fraud anomalies and risk scores render in dashboard
  - Unit + integration tests for route contracts and access checks

2. Replace mock KYC completion with real KYC workflow integration
- Why: current `POST /api/dashboard/kyc` only toggles local state.
- Integrate:
  - `packages/pulse-identity-service/service.ts`
  - `packages/pulse-kyc-service/service.ts`
  - `pulse-connect-core/src/ecommerce/controllers/compliance.controller.ts`
- Deliver:
  - KYC status endpoint (pending/verified/rejected + reason + audit)
  - KYC submission/review status views
  - Paid-tier actions blocked by real KYC status, not local simulation
- Acceptance:
  - Premium/Enterprise unlock only when upstream KYC status is verified
  - KYC pending/rejected reasons visible to user
  - KYC tests cover happy path, rejection path, expiry/pending edge cases

3. Identity/auth account lifecycle in dashboard
- Why: auth/account features exist but are not surfaced.
- Integrate:
  - `services/pulse-intelligence-core/src/accounts/auth.controller.ts`
  - `services/pulse-intelligence-core/src/accounts/accounts.controller.ts`
  - `packages/pulse-identity-service/service.ts`
- Deliver:
  - Account security section for 2FA setup, session/device visibility, token rotation controls
  - Account history and deactivation path
  - Verify-email and onboarding-status visibility
- Acceptance:
  - User can enable 2FA, view account history, and manage account lifecycle from dashboard
  - Security audit events logged and visible in ops/security traces

4. Real billing + subscription management integration
- Why: dashboard tier change is local and not connected to full billing engine controls.
- Integrate:
  - `services/billing-engine/src/server.ts`
  - `services/pulse-intelligence-core/src/ecommerce/ecommerce.controller.ts`
- Deliver:
  - Upgrade/renew/cancel subscription actions against billing engine
  - Ledger and subscription status rendering
  - Refund actions for eligible transactions
- Acceptance:
  - Subscription actions mutate upstream state and reflect immediately in dashboard snapshot
  - Invoice and ledger views reconcile with billing API responses

## P1 (Commercial and Operational Expansion)

1. Places marketplace operations
- Integrate:
  - `pulse-connect-core/src/places/services/api.routes.ts`
- Deliver:
  - Create/update/delete place listing
  - Booking calculation/create/cancel/list
  - Transaction and ledger entry viewer
- Acceptance:
  - Enterprise and eligible premium roles can perform booking/listing workflows
  - Trace IDs and failure reasons shown in UI

2. Matchmaking full lifecycle
- Integrate:
  - `pulse-connect-core/src/matchmaking/services/api.routes.ts`
- Deliver:
  - Brief creation, match retrieval, proposal lifecycle, contract/milestone actions, invoice/reputation views
- Acceptance:
  - Matchmaking module moves from read-only suggestions to transactional workflows
  - Role and tier rules enforced for each action

3. Communication upgrade to real-time channels
- Integrate:
  - `pulse-connect-core/src/communication/services/real-time-messaging.service.ts`
  - `email.connector.ts`, `sms.connector.ts`, `social-connector.ts`
- Deliver:
  - Conversation threads, typing/presence, reactions, message search
  - Channel delivery controls (email/SMS/social) and delivery statuses
- Acceptance:
  - Users can send/receive in near real-time
  - Delivery status and channel-level failures are visible

4. CSI approvals workflow in dashboard
- Integrate:
  - `packages/csi/governance.ts`
  - Existing `csi-gateway` advisory payload contracts
- Deliver:
  - Approval queue for `requiresApproval=true` recommendations
  - Founder/superadmin approval actions + audit trail
- Acceptance:
  - No recommendation requiring approval can be applied without explicit authorized approval
  - Governance decision history visible in operations/security

## P2 (Planetary Intelligence and Advanced Localization)

1. Advanced localization suite
- Integrate:
  - `machine-translation.service.ts`, `speech-translation.service.ts`, `sign-language.service.ts`
  - `geo-router.service.ts`, `wallet-fees.service.ts`, `proximityIntegration.ts`
- Deliver:
  - Text/speech/sign translation UX
  - Region-aware routing insights and localization confidence
  - Localization cost/billing visibility for premium/enterprise
- Acceptance:
  - Multi-modal translation and region-aware localization metadata visible in dashboard
  - Localization billing reconciles with wallet/fees service

2. Advanced proximity operations
- Integrate:
  - `pulse-connect-core/src/proximity/api/routes.ts`
  - `services/proximity-power-house-vX100/src/proximity/proximity.controller.ts`
- Deliver:
  - Reverse geocode, distance, clustering, proximity health/metrics in operations panel
- Acceptance:
  - Geospatial operations available behind tier/consent controls
  - Ops panel includes proximity health and latency metrics

3. MARP governance/observability/arbitration exposure
- Integrate:
  - `services/marp-observability/*`
  - `services/marp-governance-core/*`
  - `services/marp-founder-arbitration/*`
- Deliver:
  - Governance status, policy validation/signing views
  - Firewall/routing rule visibility
  - Arbitration request/status panel for governed actions
- Acceptance:
  - Enterprise governance users can inspect policy and arbitration state in one place
  - No direct bypass around gateway/governance constraints

## Suggested Execution Order

1. P0.1 Reporting/Fraud
2. P0.2 Real KYC
3. P0.3 Identity/Auth security controls
4. P0.4 Billing/subscription sync
5. P1.1 Places operations
6. P1.2 Matchmaking lifecycle
7. P1.3 Real-time communication
8. P1.4 CSI approvals
9. P2 advanced localization/proximity/MARP governance

## Non-Negotiable Guardrails

- CSI access remains gateway-mediated only; no direct CSI client imports in dashboard runtime.
- Consent-aware behavior preserved for localization/marketing/places.
- Paid-tier operations continue to require full KYC verification.
- Every new module ships with unit + integration tests.
- All new endpoints include structured logging, monitoring hooks, and backup-safe behavior.

