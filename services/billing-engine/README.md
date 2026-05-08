# @pulsco/billing-engine

Local dev README and examples for subscription endpoints.

Docs

- Swagger UI: `GET /docs` (served from the OpenAPI spec)

Quick curl examples

Create or fetch wallet:

```bash
curl -X POST http://localhost:3100/marp/wallet/create \
  -H "Content-Type: application/json" \
  -d '{"walletId":"w-123","accountId":"acct-123","balance":5000}'
```

Calculate activity charge (quote only):

```bash
curl -X POST http://localhost:3100/marp/activity/calculate \
  -H "Content-Type: application/json" \
  -d '{"event":{"engine":"ecommerce","amount":99},"region":"Europe West 1"}'
```

Create subscription (signup):

```bash
curl -X POST http://localhost:3100/marp/subscription/create \
  -H "Content-Type: application/json" \
  -d '{"accountId":"acct-123","walletId":"w-123","planId":"basic","price":100,"region":"us","idempotencyKey":"k1","autoRenew":true}'
```

Renew subscription (explicit):

```bash
curl -X POST http://localhost:3100/marp/subscription/renew \
  -H "Content-Type: application/json" \
  -d '{"accountId":"acct-123","idempotencyKey":"renew-1"}'
```

Upgrade (prorated):

```bash
curl -X POST http://localhost:3100/marp/subscription/upgrade \
  -H "Content-Type: application/json" \
  -d '{"accountId":"acct-123","walletId":"w-123","newPlanId":"pro","newPrice":200,"idempotencyKey":"up-1"}'
```

Cancel (effective period end):

```bash
curl -X POST http://localhost:3100/marp/subscription/cancel \
  -H "Content-Type: application/json" \
  -d '{"accountId":"acct-123"}'
```

Run locally

```powershell
cd services\billing-engine
pnpm install
pnpm run build
# optional: set DATABASE_URL and run migrations before starting if you want Postgres persistence
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/billing_dev"
pnpm run migrate
pnpm start
```

Run tests

```powershell
cd services\billing-engine
pnpm install
pnpm run test
```

Run simulation (fast mode):

```powershell
$env:SIMULATE_FAST=1; $env:SIMULATE_SEED='local-001'; pnpm run simulate
```

# @pulsco/billing-engine

Local scaffold for the Pulsco billing engine. Provides:

- PolicyRegistry, LedgerService, WalletService, Orchestrator
- Simple JSON persistence (dev only)
- Minimal Express server exposing `/billing/calculate`, `/billing/charge`, `/ledger/:accountId`

Run locally (development):

```bash
cd services/billing-engine
pnpm install
pnpm dev
```

Run tests:

```bash
pnpm test
```

Notes:

- This is a development scaffold for simulation and validation. Production persistence, KMS signing, and hardened APIs must be implemented before live use.
  Environment variables (optional):

-- `DATABASE_URL`: PostgreSQL connection string. When set, the server uses Postgres persistence instead of local JSON files.
-- `SECONDARY_DATABASE_URL`: PostgreSQL connection string for the Aurora read replica. Required for the `/health/secondary` endpoint.
-- MARP endpoints: server exposes MARP-branded endpoints under `/marp/*` (e.g. `/marp/billing/charge`).

- `PORT`: port for the express server (default 3100).

KMS / MARP signing integration (optional):

- To use AWS KMS for MARP policy signing/verification, set `MARP_AWS_KMS_KEY_ID` and ensure AWS SDK v3 (`@aws-sdk/client-kms`) is installed in this package's node_modules.
- For Azure Key Vault, set `MARP_AZURE_KEY_VAULT_URL` and `MARP_AZURE_KEY_NAME` and ensure the Azure SDK packages are installed; the adapter is provided in this scaffold.
- If no KMS variables are provided, the server falls back to an HMAC-based local signer (development only). Do NOT use HMAC in production.

When using Postgres, the package will create simple tables automatically. The migrations include a hardened schema and an atomic function `marp_create_ledger_entry` which must be used for ledger writes to guarantee no overdrafts and idempotency at the DB level.

When using Postgres, the package will create simple tables automatically. The migrations include a hardened schema and an atomic function `marp_create_ledger_entry` which must be used for ledger writes to guarantee no overdrafts and idempotency at the DB level.

Ensure you run the migrations in order (001, 002, 003, 004, 005) so the DB function, constraints, and indexes are created before ledger writes occur.

## Health Checks

- `GET /health`: Verifies connectivity to the primary write database.
- `GET /health/secondary`: Verifies connectivity to the global read replica.

## Request Context

For endpoints like `POST /marp/ledger/create`, the `RequestContext` (from `@pulsco/shared/lib/requestContext`) is expected to be populated with `userId` and `role`. This information is automatically included in the ledger entry's metadata for audit purposes.

## Emergency Protocol Distribution Setup

Set these environment variables in billing-engine runtime:

- `ADMIN_GATEWAY_URL` (for enforcement snapshot pull)
- `INTERNAL_SERVICE_TOKEN` (must match admin/edge)
- `EMERGENCY_POLICY_CACHE_MS` (optional, default `5000`)

Billing now also receives push fan-out updates at:

- `POST /internal/emergency-protocol/event`

This endpoint requires either `x-internal-service-token` or `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`.
