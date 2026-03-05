# CSI Package (`@pulsco/csi`)

Central Super Intelligence (CSI) shared package for Pulsco.  
CSI is advisory-only by design: it learns from subsystem events, stores intelligence in VAULT, and recommends actions without autonomously controlling subsystems.

## Modules

- `events.ts`
  - Standardizes subsystem event shape.
  - Provides in-process event bus utilities for emit/subscribe.
- `engine/ingestion.ts`
  - Subscribes to all event streams.
  - Handles allow-lists, validation, and de-duplication.
- `engine/analysis.ts`
  - Detects recurring patterns and correlated risk signals.
- `engine/scoring.ts`
  - Computes trust/performance scores per subsystem and globally.
- `engine/recommendations.ts`
  - Generates actionable advisory recommendations with governance approval level hints.
- `vault.ts`
  - Secure storage abstraction for intelligence/audit records.
  - Enforces PC365-authenticated, audited reads/writes.
- `governance.ts`
  - Decision workflow with Level1/2/3 rules.
  - Founder/Superadmin required for strategic Level3 approvals.
- `simulate.ts`
  - Runs historical replay simulations for proposed changes.
  - Persists reports into VAULT.

## Event Standard

All subsystems should emit:

```ts
{
  subsystem: string,
  eventType: string,
  region: string,
  timestamp: number,
  metrics: Record<string, any>,
  riskScore?: number,
  performanceScore?: number
}
```

### Add new event types

1. Choose a stable `eventType` namespace, e.g. `order.created`.
2. Emit through `emitSubsystemEvent(...)` or `createSubsystemEmitter(...)`.
3. Add tests to verify shape and emission.
4. If risk-sensitive, include `riskScore` and relevant metrics (`errorRate`, `latencyMs`, etc).

## Extend analytics/scoring

1. Add custom pattern/risk logic in `engine/analysis.ts`.
2. Add metric-specific scoring rules in `engine/scoring.ts`.
3. Add recommendation mapping in `engine/recommendations.ts`.
4. Add/adjust tests under `packages/csi/__tests__`.

## VAULT API usage

```ts
import { CSIIntelligenceVault, InMemorySecureDatabaseAdapter } from "@pulsco/csi";

const vault = new CSIIntelligenceVault(new InMemorySecureDatabaseAdapter());
await vault.storeAggregatedIntelligence({ summary: "..." }, {
  actorId: "admin-1",
  actorRole: "superadmin",
  pc365Attestation: "attestation-token",
});
```

Any VAULT read/write requires `pc365Attestation` and writes a corresponding audit log.

## Governance workflow

- `Level1`
  - Low-risk, within guardrails.
  - Auto-optimization path (advisory recommendation only).
- `Level2`
  - Moderate risk or guardrail exception.
  - Semi-automated with notification and supervised rollout.
- `Level3`
  - Strategic/high-risk.
  - Requires Founder/Superadmin approval before execution.

## Simulation usage

Simulation can be:

- Manually triggered by admin/governance workflow.
- Triggered inside proposal evaluation (`runSimulation` option).

Each simulation report includes:

- Baseline vs predicted trust/performance
- Deltas and outcome (`improve`, `neutral`, `regress`)
- Advisory notes
