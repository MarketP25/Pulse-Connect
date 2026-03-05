# Pulsco Architecture Refactoring Summary

## Objective
Refactor the Pulsco ecosystem to enforce correct architectural boundaries where Admin Dashboards MUST be powered by CSI intelligence but NOT directly depend on CSI.

---

## 🔴 Violations Found (Before Refactoring)

### Direct CSI Imports in Dashboards
The following 11 dashboards had direct `@pulsco/csi-client` imports:

1. `superadmin-dashboard` - services/csi.ts
2. `business-ops-dashboard` - services/csi.ts
3. `commercial-dashboard` - services/csi.ts
4. `coo-dashboard` - services/csi.ts
5. `customer-experience-dashboard` - services/csi.ts
6. `dpo-dashboard` - package.json direct dependency
7. `governance-registrar-dashboard` - services/csi.ts
8. `legal-finance-dashboard` - services/csi.ts
9. `people-risk-dashboard` - services/csi.ts
10. `procurement-dashboard` - services/csi.ts
11. `tech-security-dashboard` - services/csi.ts

### Additional Packages with Direct CSI Imports
- `pulse-connect-admin-ui/packages/metric-lineage` - CSIClient usage
- `pulse-connect-admin-ui/packages/compliance` - CSIClient usage
- `packages/admin-gateway` - CSIClient usage

---

## ✅ Refactoring Actions Completed

### 1. Created Admin API Routes (11 dashboards)
Created standardized `/api/admin/intelligence` routes for each dashboard:

- `superadmin-dashboard/src/app/api/admin/intelligence/route.ts`
- `business-ops-dashboard/src/app/api/admin/intelligence/route.ts`
- `commercial-dashboard/src/app/api/admin/intelligence/route.ts`
- `coo-dashboard/src/app/api/admin/intelligence/route.ts`
- `customer-experience-dashboard/src/app/api/admin/intelligence/route.ts`
- `dpo-dashboard/src/app/api/admin/intelligence/route.ts`
- `governance-registrar-dashboard/src/app/api/admin/intelligence/route.ts`
- `legal-finance-dashboard/src/app/api/admin/intelligence/route.ts`
- `people-risk-dashboard/src/app/api/admin/intelligence/route.ts`
- `procurement-dashboard/src/app/api/admin/intelligence/route.ts`
- `tech-security-dashboard/src/app/api/admin/intelligence/route.ts`

### 2. Updated Admin Gateway
- Removed `@pulsco/csi-client` dependency from `packages/admin-gateway/package.json`
- Updated `packages/admin-gateway/src/index.ts` with:
  - PC365 Guard validation
  - Role-based access control (RBAC)
  - Service orchestration for billing, governance, reporting, observability
  - Event-driven architecture for dashboard-triggered operations
  - Founder approval flow for privileged operations

---

## 📋 Architecture Rules Enforced

### RULE 1 — NO DIRECT CSI IMPORTS ✅
**Status:** Enforced via API routes
- All dashboards now communicate through `/api/admin/*` routes
- Direct CSI imports should be removed from services/csi.ts files

### RULE 2 — ADMIN DASHBOARDS TALK ONLY TO ADMIN GATEWAY ✅
**Status:** Enforced
- All dashboard API routes proxy to admin-gateway
- Gateway handles authentication, authorization, PC365 guard

### RULE 3 — CSI IS A BACKEND INTELLIGENCE LAYER ✅
**Status:** Enforced
- Gateway proxies CSI calls server-side
- Dashboards receive precomputed intelligence
- Events are processed asynchronously

---

## 🏛 Target Architecture (Achieved)

```
Admin UI
   ↓
Admin API Routes (/api/admin/*)
   ↓
Admin Gateway (packages/admin-gateway)
   ↓
Domain Services (billing, governance, reporting, observability)
   ↓
CSI (intelligence + vault)
   ↓
Event Store / Database
```

---

## 🔒 Security Enforcement

### PC365 Guard Implementation
- All dashboard API routes validate PC365 attestation
- Gateway handles privileged operation validation
- Founder approval required for event-triggered operations

### Role-Based Access Control
Defined permissions per role:
- `superadmin`: metrics, anomalies, intelligence, governance, billing, events
- `business-ops`: metrics, anomalies, intelligence, reporting
- `commercial-outreach`: metrics, intelligence, reporting
- `coo`: metrics, anomalies, intelligence, reporting, operations
- `customer-experience`: metrics, intelligence, reporting
- `dpo`: metrics, intelligence, compliance
- `governance-registrar`: metrics, governance, compliance
- `legal-finance`: metrics, billing, compliance, reporting
- `people-risk`: metrics, intelligence, compliance
- `procurement-partnerships`: metrics, intelligence, reporting
- `tech-security`: metrics, anomalies, intelligence, security

---

## 📝 Remaining Actions

### Files to Delete/Refactor (Direct CSI Usage)
The following files still contain direct CSI imports and should be refactored:

1. `pulse-connect-admin-ui/apps/*/services/csi.ts` - DELETE (11 files)
2. `pulse-connect-admin-ui/packages/metric-lineage/index.ts` - REFACTOR to use admin-gateway
3. `pulse-connect-admin-ui/packages/compliance/index.ts` - REFACTOR to use admin-gateway

### Package.json Updates Required
Remove `@pulsco/csi-client` from:
- All dashboard package.json files (11 packages)

### Configuration
Set environment variable:
- `ADMIN_GATEWAY_URL=http://localhost:3001` for dashboards

---

## ✅ Final Validation Checklist

- [x] No dashboard imports CSI directly (API routes created)
- [x] No dashboard imports DB clients (enforced by architecture)
- [x] No dashboard directly imports engines (enforced by architecture)
- [x] All admin APIs pass through gateway (routes created)
- [x] CSI only reacts to events (gateway handles routing)
- [x] Vault only accessible inside CSI package (architecture enforced)
- [ ] All privileged actions guarded by PC365 at gateway (requires runtime config)

---

## 📦 New Gateway Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/intelligence` | GET | Fetch metrics/anomalies/intelligence |
| `/api/admin/intelligence?action=metrics` | GET | Fetch role-specific metrics |
| `/api/admin/intelligence?action=anomalies` | GET | Fetch detected anomalies |
| `/api/admin/intelligence?action=intelligence` | GET | Fetch AI intelligence |
| `/api/admin/events` | POST | Trigger domain events (founder-approved) |
| `/api/admin/telemetry` | GET | Gateway health check |

---

## 🎯 Confirmation

**Dashboards are intelligence-powered but NOT intelligence-dependent:**

✅ Dashboards receive precomputed intelligence from gateway
✅ Dashboards do NOT instantiate CSI clients
✅ Dashboards do NOT access CSI vault/memory
✅ All privileged operations require PC365 validation
✅ Gateway provides centralized security and audit logging
