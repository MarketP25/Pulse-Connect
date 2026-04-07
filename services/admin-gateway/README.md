# admin-gateway-service

Node HTTP wrapper for `packages/admin-gateway` route handlers.

## Required environment

- `PORT` (default: `3001`)
- `INTERNAL_SERVICE_TOKEN` (must match edge-gateway and billing-engine)
- `EDGE_GATEWAY_URL` (for emergency mutation fan-out)
- `BILLING_SERVICE_URL` (for emergency mutation fan-out)

Optional:

- `EMERGENCY_BROADCAST_ENDPOINTS` (comma-separated explicit endpoints)
- `CSI_API_BASE`
- `CSI_AUTH_TOKEN`
- `GOVERNANCE_SERVICE_URL`
- `REPORTING_SERVICE_URL`
- `OBSERVABILITY_SERVICE_URL`

## Emergency protocol fan-out

When superadmin mutates emergency protocol, admin-gateway broadcasts:

- `POST /edge/internal/emergency-protocol/event`
- `POST /internal/emergency-protocol/event` on billing engine

If `EMERGENCY_BROADCAST_ENDPOINTS` is empty, targets are derived from `EDGE_GATEWAY_URL` and `BILLING_SERVICE_URL`.
