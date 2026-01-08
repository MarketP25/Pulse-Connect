# PULSCO (Pulse Connect) Edge Gateway

## Overview

The PULSCO (Pulse Connect) Edge Gateway is the global execution surface operating under MARP governance. It verifies MARP-signed policies, routes requests to subsystem adapters, enforces rate limits and regional constraints, and records immutable audits for every decision.

- Governance perimeter: MARP signature verification and policy validation
- Adapter registry: Subsystem integrations registered and versioned at the Edge
- Immutable audits: All decisions captured in append-only audit tables
- Planetary operations: Regionalized deployments and health checks

Related schema and seeds:
- infra/db-migrations/007_edge_gateway.sql — edge_audit, edge_matchmaking_events, and adapter registry seeding (ecommerce, payments, fraud, proximity-geocoding, communication, marketing, places, chatbot, ai-programs)
- infra/db-migrations/006_marp_observability.sql — governance observability and SLO tracking

End-to-end governance tests:
- tests/marp-integration.test.ts — exercises MARP Governance Core and Firewall Gateway flows

## Architecture

### Core Components
- Edge API: ingress/egress API with signature verification and request mapping
- Policy cache: regional policy snapshot storage and version pinning
- Execution engine: policy enforcement, rate limits, basic geofence hooks
- Telemetry: decision metrics and subsystem usage events
- Subsystem adapters: integration layer for internal and third-party services

### Trust & Security
- MARP signature verification on requests and policy bundles
- Immutable decision audit with cryptographic hash chaining (see @pulsco/shared-lib/hashChain)
- Least-privilege access to subsystem adapters
- Regional isolation and fail-safe on last valid snapshot

## Subsystem Integration

Adapters are registered at the Edge with declared capabilities (see 007_edge_gateway.sql seed):
- Core: ecommerce, payments, fraud
- Extended: proximity-geocoding, communication, marketing (PAP), places, chatbot (AI engine), ai-programs

Each adapter should expose:
- /health — readiness/health check
- Contract tests — validated via CI
- Policy mappings — decision points and capability flags

## API Endpoints

### Execute
```http
POST /edge/execute
Content-Type: application/json
{
  "requestId": "uuid",
  "subsystem": "ecommerce",
  "action": "purchase",
  "userId": "user123",
  "regionCode": "US-EAST",
  "context": { "amount": 99.99 },
  "marpSignature": "signature..."
}
```
Response:
```json
{
  "requestId": "uuid",
  "decision": "allow",
  "rationale": "Policy compliant",
  "policyVersion": "1.0.0",
  "executionTime": 45
}
```

### Policy Version
```http
GET /edge/policy/version?subsystem=ecommerce&regionCode=US-EAST
```

### Health
```http
GET /edge/health
```

## Configuration

### Environment Variables
```bash
# MARP integration
MARP_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----...\n...
MARP_PUBLIC_KEY_VERSION=v1

# Regional configuration
REGION_CODE=US-EAST-ATLANTA
INSTANCE_ID=edge-us-east-01

# Database (adapter registry + audit)
POSTGRES_URL=postgresql://user:pass@host:5432/edge

# Messaging (optional; used by some adapters)
KAFKA_URL=localhost:9092

# Redis (rate limiting / token bucket)
REDIS_URL=redis://localhost:6379
```

### Planetary Deployment
Deploy regionally across 50+ regions with Kubernetes. See infra/k8s/* for examples.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-gateway
  namespace: planetary-pulse
spec:
  replicas: 10
  selector:
    matchLabels:
      app: edge-gateway
  template:
    metadata:
      labels:
        app: edge-gateway
        region: us-east
    spec:
      containers:
      - name: edge-gateway
        image: pulsco/edge-gateway:latest
        ports:
        - containerPort: 3001
        env:
        - name: REGION_CODE
          valueFrom:
            fieldRef:
              fieldPath: metadata.labels['region']
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
```

## Telemetry & SLOs

- Execution latency (p95)
- Signature verification success rate
- Audit completeness (immutable logs written per decision)
- Per-adapter health and error rate

Alerting examples:
- Latency p95 > 200ms
- Signature failures > 0.1%
- Adapter unhealthy > 5m
- Database connectivity errors

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm run start:dev

# Run tests
pnpm run test

# Build for production
pnpm run build
```

Tests should validate:
- MARP signature verification
- Policy enforcement
- Adapter contract compliance
- Audit record creation and hash chaining

## Operations

Operational guide: infra/runbooks/edge-gateway-operations.md
- MARP key rotation and version pinning
- Regional scaling and rollout
- Adapter registry updates (register/update/deprecate)
- Audit completeness checks and snapshot verification

## Contributing

- TypeScript strict mode, tests required with meaningful coverage
- Security review for policy changes and adapter bindings
- Update adapter registry schema and seeds when adding new adapters

---

This document aligns the Edge Gateway with the current repository code. PULSCO is an abbreviation of Pulse Connect; Edge operates under MARP governance with an adapter registry and immutable audits as implemented here.