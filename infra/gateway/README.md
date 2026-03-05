# Pulsco Unified-Origin Gateway

This folder defines the single-origin deployment contract for Pulsco.

## Canonical origin

- `https://pulsco.com`

## Route map

- `/` → `pulse-portal`
- `/connect/*` → `pulse-connect-ui`
- `/admin/*` → `pulse-connect-admin-ui` + governed dashboards
- `/billing/*` → `edge-gateway-service` (governed)
- `/wallet/*` → `edge-gateway-service` (governed)
- `/auth/*` → `edge-gateway-service` (governed)
- `/edge/*` → `edge-gateway-service` (governed)
- `/marp/*` → `marp-firewall-gateway-service` (governed)

## Files

- `infra/gateway/nginx/pulsco-unified-origin.conf` — NGINX reference config.
- `infra/k8s/pulsco-unified-origin-ingress.yaml` — Kubernetes ingress for single origin.
- `infra/k8s/pulsco-unified-origin-services.yaml` — Service manifests required by unified ingress.

## Operational rules

- Do not expose independent app origins publicly.
- All critical actions route through governed services (`/edge/*`, `/marp/*`).
- Keep basePath settings aligned with the route map and CI governance checks.
- Ensure Deployments use `app` labels matching selectors in `pulsco-unified-origin-services.yaml`.
