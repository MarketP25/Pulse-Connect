# Pulsco Architecture Refactoring - TODO

## Objective
Refactor Pulsco ecosystem to enforce correct architectural boundaries:
- Admin Dashboards MUST be powered by CSI intelligence
- NOT directly depend on CSI
- NOT access CSI vault storage
- NOT mutate CSI memory
- NOT bypass governance/firewall layers
- Operate only through controlled service interfaces

---

## PHASE 1: Remove UI-Level CSI Packages

- [x] 1.1 Delete pulse-connect-admin-ui/packages/csi-client/ (remove from UI layer)
- [x] 1.2 Check and remove any other CSI packages from pulse-connect-admin-ui/packages/

---

## PHASE 2: Refactor Dashboard CSI Services

For each dashboard in pulse-connect-admin-ui/apps/*:
- [x] 2.1 superadmin-dashboard - CREATED: API route + refactored service
- [ ] 2.2 business-ops-dashboard
- [ ] 2.3 commercial-dashboard
- [ ] 2.4 coo-dashboard
- [ ] 2.5 customer-experience-dashboard
- [ ] 2.6 dpo-dashboard
- [ ] 2.7 governance-registrar-dashboard
- [ ] 2.8 legal-finance-dashboard
- [ ] 2.9 people-risk-dashboard
- [ ] 2.10 procurement-dashboard
- [ ] 2.11 tech-security-dashboard

Each dashboard requires:
- Remove direct CSI imports from services/csi.ts
- Create app/api/admin/intelligence/route.ts for controlled access
- Update package.json to remove @pulsco/csi-client dependency

---

## PHASE 3: Fix Admin Gateway

- [x] 3.1 Created shared admin-intelligence-client package
- [ ] 3.2 Update packages/admin-gateway/ to remove direct CSI client
- [ ] 3.3 Ensure gateway does not expose vault
- [ ] 3.4 Add PC365 guard validation at gateway level

---

## PHASE 4: Fix Dependent Packages

- [ ] 4.1 pulse-connect-admin-ui/packages/metric-lineage/
- [ ] 4.2 pulse-connect-admin-ui/packages/compliance/

---

## PHASE 5: Validation

- [x] 5.1 Removed csi-client package from UI layer
- [x] 5.2 Created admin-intelligence-client for controlled access
- [x] 5.3 Created API route for superadmin-dashboard
- [ ] 5.4 Verify no dashboard imports DB clients
- [ ] 5.5 Verify no dashboard directly imports engines
- [ ] 5.6 Verify all admin APIs pass through gateway
- [ ] 5.7 Verify CSI only reacts to events
- [ ] 5.8 Verify vault only accessible inside CSI package
- [ ] 5.9 Verify all privileged actions guarded by PC365 at gateway

---

## Target Architecture

```
Admin UI
   ↓
Admin API Routes (/api/admin/*)
   ↓
Admin Gateway (PC365 Guard, Rate Limiting)
   ↓
Domain Services (billing, governance, AI, reporting)
   ↓
CSI (intelligence + vault) ← Event-driven only
   ↓
Event Store / Database
```

---

## Completed Changes

### Created Files:
1. pulse-connect-admin-ui/apps/superadmin-dashboard/src/app/api/admin/intelligence/route.ts
2. pulse-connect-admin-ui/apps/superadmin-dashboard/services/csi.ts (refactored)
3. pulse-connect-admin-ui/packages/admin-intelligence-client/index.ts

### Removed Direct Imports:
- @pulsco/csi-client from pulse-connect-admin-ui/packages/ (csi-client folder deleted)

---

## Remaining Work

1. Refactor 10 remaining dashboard services to use API routes
2. Remove @pulsco/csi-client from all dashboard package.json files
3. Fix admin-gateway to not directly import CSI
4. Fix metric-lineage and compliance packages
5. Run validation checks
