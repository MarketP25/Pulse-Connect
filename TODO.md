# MARP Implementation TODO

## Phase 1: Service Structure Setup
- [ ] Create services/marp-governance-core directory structure
- [ ] Create services/marp-firewall-gateway directory structure
- [ ] Create services/marp-admin-ui-adapter directory structure
- [ ] Create services/marp-founder-arbitration directory structure
- [ ] Create services/marp-observability directory structure

## Phase 2: Database Schema
- [ ] Create infra/db-migrations/003_marp_schema.sql (governance tables)
- [ ] Create infra/db-migrations/004_marp_firewall.sql (firewall tables)
- [ ] Create infra/db-migrations/005_marp_audit.sql (audit & bundles tables)
- [ ] Add hash-chaining triggers for all tables
- [ ] Add monthly partition templates

## Phase 3: Core Controllers & DTOs
- [ ] Implement Policy API (GET /marp/policies/active, POST /marp/policies/validate, POST /marp/policies/sign)
- [ ] Implement Firewall API (GET /marp/firewall/rules, POST /marp/firewall/rules, POST /marp/firewall/enforce)
- [ ] Implement Councils API (POST /marp/councils/vote, GET /marp/councils/decisions)
- [ ] Implement Subsystems API (POST /marp/subsystems/register, POST /marp/subsystems/route)
- [ ] Implement Conflicts API (POST /marp/conflicts/report, POST /marp/conflicts/escalate)
- [ ] Implement Audit API (GET /marp/audit/logs)
- [ ] Implement Bundles API (GET /marp/bundles/:id, POST /marp/bundles/distribute)

## Phase 4: Security Middleware
- [ ] Extend PC365 Guard middleware for MARP
- [ ] Implement MARP Signature middleware
- [ ] Add signature verification logic
- [ ] Add payload hash validation

## Phase 5: Service Classes
- [ ] Governance service (council management, policy validation)
- [ ] Firewall service (rule enforcement, traffic routing)
- [ ] Audit service (logging, hash chain validation)
- [ ] Founder arbitration service (override handling)
- [ ] Observability service (metrics collection)

## Phase 6: Event Bus Integration
- [ ] Kafka/Pulsar producers for marp-governance-updates
- [ ] Producers for edge-policy-snapshots
- [ ] Producers for marp-firewall-events
- [ ] Producers for marp-conflicts
- [ ] Producers for marp-audit-stream
- [ ] Consumers for all topics with idempotency

## Phase 7: Default Configurations
- [ ] Create shared/lib/marp-policies.json (default policies)
- [ ] Create shared/lib/marp-firewall-rules.json (starter rules)
- [ ] Create shared/lib/marp-routing-blueprint.json (subsystem routing)

## Phase 8: Observability
- [ ] Metrics dashboards for quorum latency, firewall actions, snapshot freshness
- [ ] SLO monitoring (policy validation <500ms, snapshot distribution <5s)
- [ ] Alert configurations for stale snapshots, high block rates, quorum failures
- [ ] Signature verification rate monitoring

## Phase 9: CI/CD Pipelines
- [ ] Pre-merge pipeline (schema validation, contract tests, secret scanning)
- [ ] Pre-deploy pipeline (hash-chain migration dry-run, canary routing)
- [ ] Post-deploy pipeline (smoke tests, SLO validation, auto-rollback)

## Phase 10: Testing & Documentation
- [ ] Unit tests for all services and middleware
- [ ] Integration tests for API contracts
- [ ] Security tests for PC365 and signature validation
- [ ] Performance tests for SLO compliance
- [ ] Runbooks for operations and incident response
- [ ] API documentation and routing diagrams

## Phase 11: Integration & Deployment
- [ ] Update pnpm-workspace.yaml for new services
- [ ] Add environment variables to infra configs
- [ ] Update Kubernetes federation config
- [ ] Integration testing with existing subsystems
- [ ] Load testing and performance validation
