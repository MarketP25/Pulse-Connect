# SYSTEM-MANIFEST: Proximity Powerhouse (vX.100)

This document outlines the architecture, components, and operational parameters of the Pulsco Proximity Powerhouse. It serves as a living specification and an audit artifact.

**Version:** 1.0.0
**Status:** Scaffolding Complete. Core Controller Logic Enhanced.

---

## 🏛️ System Architecture

The Proximity Powerhouse is a microservice designed for planetary-scale geocoding, routing, and region intelligence.

- **Core Service:** `proximity-service`
- **API Layer:** Express-based, with strict schema validation (`zod`).
- **Provider Layer:** Abstracted geocoding providers (Google, OSM) with a health-aware router.
- **Computation Layer:** Engines for distance, travel time, clustering, and region analysis.
- **Infrastructure Layer:** Redis for read-through caching and an outbox for resilient operations.
- **Governance Layer:** ConsentGuard and AuditEngine to enforce compliance.

## 🚀 Performance Targets

| Metric            | Target      |
|-------------------|-------------|
| **p50 Latency**   | ≤ 80ms      |
| **p95 Latency**   | ≤ 200ms     |
| **Error Rate**    | < 1%        |
| **Cache Hit Ratio** | ≥ 70% (warm) |
| **Throughput**    | ≥ 50 RPS    |

## 🔐 Governance & Compliance

- **Consent-First:** All location computations are gated by `ConsentGuard`.
- **Audit Trail:** Every request is logged with a comprehensive set of metadata (`actorId`, `purpose`, `policyVersion`, etc.).
- **Data Privacy:** Coordinates are redacted in logs unless for explicit `fraud` analysis.
- **Schema Enforcement:** All API endpoints validate requests against `ProximityRequestSchema`.