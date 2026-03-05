Subscription API examples

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

Run tests (inside services/billing-engine):

```powershell
cd services\billing-engine
pnpm install
pnpm run test
```
