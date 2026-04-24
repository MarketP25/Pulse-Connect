# Pulsco Unified-Origin Gateway

This folder defines the single-origin deployment contract for Pulsco.

## Canonical origin

- `https://pulsco.global`

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

# Pulsco infra

This directory contains Terraform code for Pulsco's foundational infrastructure:

- IAM bindings for service accounts
- Network (VPC, subnet, firewall)
- Storage (GCS buckets and IAM)
- Compute example
- Secrets (Secret Manager)
- Monitoring and compliance placeholders

Usage:

1. Set variables via CLI or terraform.tfvars (service_account_name, project_id, region).
2. terraform init
3. terraform plan -var="service_account_name=NAME"
4. terraform apply -var="service_account_name=NAME"

Notes:

- Keep IAM membership lists in sync with MARP registry.
- Prefer Workspace groups (group:...) instead of individual users where possible.
- Use `terraform import` to import existing resources.

## Pulsco Terraform modules

### iam

IAM bindings for service accounts.

### network

Network (VPC, subnet, firewall).

### storage

GCS buckets and IAM.

### compute

Compute example.

### secrets

Secret Manager.

### monitoring

Monitoring and compliance placeholders.
