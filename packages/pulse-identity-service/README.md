# Pulse Identity Service (`@pulsco/pulse-identity-service`)

Security-first onboarding and authentication service for Pulsco.

## Responsibilities

- Role selection and role-policy routing.
- Language/region persistence with compliance + currency binding.
- Secure account creation (password policy, hashing, anti-bot, rate limit, suspicious IP checks).
- Immutable consent recording with versioning and metadata.
- Email verification (signed one-time token).
- Referral validation and abuse prevention.
- KYC orchestration through `@pulsco/pulse-kyc-service` only.
- Optional automated KYC adjudication (`autoKycEnabled`) driven by risk signals.
- Account activation lifecycle and billing subscription linkage.
- Stateless JWT auth with refresh-token rotation and session invalidation.
- Passive CSI event feed through Admin Gateway (`user.created`, `user.verified`, `user.kyc_completed`, `user.login`).

## Architecture Guardrails

- No direct CSI dependency.
- Event publishing only through Admin Gateway event endpoint.
- KYC verification logic is isolated outside identity.
- Security validation runs before trust scoring and event emission.

## Quick Start

```ts
import {
  InMemoryIdentityStorageAdapter,
  PulseIdentityService,
  InMemoryKycRepository,
  PulseKycService,
  BillingEngineClient,
  NoopIdentityEventPublisher,
} from "@pulsco/pulse-identity-service";

const storage = new InMemoryIdentityStorageAdapter();
const kyc = new PulseKycService(new InMemoryKycRepository());
const identity = new PulseIdentityService(
  {
    storage,
    kycService: kyc,
    billingClient: new BillingEngineClient(),
    eventPublisher: new NoopIdentityEventPublisher(),
  },
  {
    exposeDebugTokens: true,
    autoKycEnabled: true,
  },
);
```

## Extending

- Replace in-memory storage with a DB adapter implementing `IdentityStorageAdapter`.
- Replace in-memory queue/session store with Redis-backed implementations.
- Connect event publishing with service attestation headers in production.
