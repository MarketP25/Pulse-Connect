# MARP Billing Engine — API Contract

Base URL: `http://{host}:{port}`

Endpoints (MARP-branded)

- POST /marp/billing/calculate
  - Request: { base: number, region: string, at?: ISOString }
  - Response: { base, multiplier, discounts: [], subtotal, tax, total, appliedPolicy }

- POST /marp/billing/charge
  - Request: { accountId, walletId, planId, price, region, at?, idempotencyKey }
  - Response: ledger entry object (see ledger schema below)
  - Errors: 400 with { error: code } (e.g., insufficient_funds, wallet-not-found, policy_signature_invalid)

- GET /marp/ledger/{accountId}
  - Response: array of ledger entries for the account

Ledger entry schema (summary)
- entryId: string
- timestamp: ISO
- accountId, walletId
- type: subscription|commission|credit|refund|usage|purchase|etc.
- amount, currency
- balanceAfter
- policyId, policyVersion (if applicable)
- discounts: [{ offerId, applied, policyId }]
- taxBreakdown: [{ region, rate, amount }]
- userExplanation: human string
- idempotencyKey
- prevHash, entryHash

Notes
- All endpoints are idempotent when `idempotencyKey` is provided.
- Policies are verified by MARP signing; unsigned policies will be rejected when a MARP verifier is available.
