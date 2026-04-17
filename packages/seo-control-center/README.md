# SEO Control Center

Planetary discovery orchestration for Pulsco Global Ltd.

## Cycle

`collect -> analyze -> generate -> optimize -> deploy -> monitor -> repeat`

## Included Engines

- `@pulsco/aseo-core`
- `@pulsco/aseo-content-engine`
- `@pulsco/programmatic-seo`
- `@pulsco/seo-schema-engine`
- `@pulsco/aseo-csi-adapter`
- `@pulsco/seo-realtime-engine`
- `@pulsco/content-refresh-engine`
- `@pulsco/gso-delivery-engine`
- `@pulsco/linking-engine`
- `@pulsco/authority-engine`

## Governance

All deployment actions flow through `MARPGovernanceLedger`:

- Action logging
- Versioned records
- Reversible operations (rollback supported)
- Deployment audit gate (deployment blocked when violations exist)

CSI directive intelligence is integrated through `CSISEODirectiveEngine`, so each cycle can prioritize regions/queries from CSI before generation and optimization.

## Hard Rules

The cycle validates:

- No keyword stuffing
- No duplicate pages
- No unstructured content
- No content without schema
- No deployment without audit

## Basic Usage

```ts
import { PlanetaryDiscoverySystem } from "@pulsco/seo-control-center";

const system = new PlanetaryDiscoverySystem({
  edgeNodes: [
    {
      id: "edge-af-east-1",
      region: "africa-east",
      countries: ["KE", "UG", "TZ"],
      languages: ["en", "sw"],
      medianLatencyMs: 35
    }
  ]
});

const result = system.runCycle({
  cycleId: "cycle-1",
  actorId: "seo-admin",
  searchTrendSignals: [],
  csiEvents: [],
  programmaticInput: { services: [], cities: [], countries: [] },
  performanceSignals: [],
  refreshCandidates: [],
  deliveryRequests: []
});
```
