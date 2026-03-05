# Pulse KYC Service (`@pulsco/pulse-kyc-service`)

Isolated KYC workflow service for onboarding and subscription upgrades.

## Scope

- Determines whether KYC is required from role + subscription tier.
- Starts and tracks KYC session state (`pending`, `verified`, `rejected`).
- Provides risk-based automation evaluation for pending KYC sessions.
- Stores auditable KYC actions through a repository interface.
- Keeps KYC logic isolated from identity/account creation.

## Usage

```ts
import { InMemoryKycRepository, PulseKycService } from "@pulsco/pulse-kyc-service";

const kyc = new PulseKycService(new InMemoryKycRepository());
const record = await kyc.startWorkflow({
  userId: "user_123",
  role: "business",
  subscriptionTier: "premium",
  actorId: "identity-service",
});
```

## Extension Points

- Replace `InMemoryKycRepository` with database-backed persistence.
- Attach external KYC provider callback handlers before calling `completeWorkflow`.
- Use `evaluatePending(...)` for automated adjudication before calling completion.
- Emit lifecycle events from the caller (identity service) after status transitions.
