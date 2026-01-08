# Pulsco Edge Gateway Operations Runbook

## Overview

The Edge Gateway is the global execution surface for Pulsco, enforcing MARP-signed policies across all planetary subsystems. It operates with local resilience, integrates all planetary subsystems, and reports telemetry back through MARP.

**Key Characteristics:**
- NestJS/Fastify service deployed across 50+ regions
- 50-500 pods with auto-scaling based on CPU/memory
- 99.999% availability target with automated failover
- All operations require MARP signature verification
- Immutable audit trails for governance compliance

## Daily Operations

### Automated Health Checks

**Frequency:** Every 10 seconds via Kubernetes probes

**Readiness Probe:**
```bash
# HTTP GET /health/ready
# Checks: Database connectivity, Redis availability, MARP key validity
curl -f http://localhost:3001/edge/health/ready
```

**Liveness Probe:**
```bash
# HTTP GET /health/live
# Checks: Memory usage, thread count, response time
curl -f http://localhost:3001/edge/health/live
```

### Manual Health Verification

**Pod Status Check:**
```bash
# Check all regions
kubectl get pods -l app=edge-gateway --all-namespaces

# Check specific region
kubectl get pods -l app=edge-gateway -n planetary-production-us-east-1
```

**Service Health Test:**
```bash
# Test with MARP signature
curl -X POST https://edge.planetary.pulse/edge/execute \
  -H "Content-Type: application/json" \
  -H "X-MARP-Signature: $(echo 'test-payload' | openssl dgst -sha256 -sign marp-private.pem | base64)" \
  -d '{"subsystem":"health","action":"check","userId":"system","regionCode":"us-east-1"}'
```

### Policy Bundle Updates

**Frequency:** Every 5 minutes via cron job

**Status Check:**
```bash
# Check last update timestamp
kubectl exec -n planetary-production deployment/edge-gateway -- cat /tmp/policy-last-update

# Manual trigger
kubectl create job policy-update --image=edge-gateway -- /app/scripts/update-policies.sh
```

## Log Analysis

### Success Patterns
```
INFO [SignatureVerifier] MARP signature verification successful - keyId: council-001, algorithm: RSA-SHA256
INFO [PolicyCache] Cache hit for policy version 2.1.3 - subsystem: ecommerce
INFO [ExecutionEngine] Rule evaluation completed - decision: allow, confidence: 0.95, executionTime: 12ms
```

### Error Patterns
```
ERROR [SignatureVerifier] MARP signature verification failed - error: invalid signature format
WARN [PolicyCache] Cache miss for policy version 2.1.3 - fetching from MARP
ERROR [Database] Connection pool exhausted - active: 50, idle: 0, pending: 25
```

### Common Queries
```bash
# Recent errors
kubectl logs --tail=100 -l app=edge-gateway | grep ERROR

# MARP signature failures
kubectl logs -l app=edge-gateway | grep "signature verification failed"

# Performance issues (slow requests)
kubectl logs -l app=edge-gateway | grep "executionTime.*[5-9][0-9][0-9]ms"
```

## Maintenance Tasks

### MARP Key Rotation

**Frequency:** Monthly or on compromise detection

**Procedure:**
```bash
# 1. Deploy new public key to ConfigMap
kubectl create configmap marp-public-key-v2 --from-file=public-key.pem=./keys/marp-public-v2.pem -n planetary-production

# 2. Update deployment environment
kubectl set env deployment/edge-gateway MARP_PUBLIC_KEY_VERSION=v2 -n planetary-production

# 3. Verify signature validation with new key
curl -X POST https://edge.planetary.pulse/edge/execute \
  -H "X-MARP-Signature: $(echo 'test' | openssl dgst -sha256 -sign marp-private-v2.pem | base64)" \
  -d '{"test": "key-rotation"}'

# 4. Wait 24 hours for old key expiration
sleep 86400

# 5. Remove old key
kubectl delete configmap marp-public-key-v1
```

### Database Maintenance

**Connection Pool Monitoring:**
```bash
# Check connection usage
kubectl exec -n planetary-production deployment/edge-gateway -- psql $DATABASE_URL -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Adjust pool size if needed
kubectl set env deployment/edge-gateway POSTGRES_POOL_SIZE=20 -n planetary-production
kubectl rollout restart deployment/edge-gateway -n planetary-production
```

### Scaling Operations

**Horizontal Scaling:**
```bash
# Scale to 100 pods for high load
kubectl scale deployment edge-gateway --replicas=100 -n planetary-production

# Regional scaling
kubectl scale deployment edge-gateway-us-west-2 --replicas=25 -n planetary-production
```

**Vertical Scaling:**
```bash
# Increase CPU limits
kubectl patch deployment edge-gateway -n planetary-production --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/cpu", "value": "2000m"}]'

# Increase memory limits
kubectl patch deployment edge-gateway -n planetary-production --type='json' -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "4Gi"}]'
```

## Incident Response

### P0 Incidents (Service Down)

**Detection:** < 5 minutes via monitoring alerts

**Immediate Actions:**
```bash
# Check pod status
kubectl get pods -l app=edge-gateway -n planetary-production

# Restart deployment
kubectl rollout restart deployment/edge-gateway -n planetary-production

# Verify recovery
kubectl wait --for=condition=available --timeout=300s deployment/edge-gateway -n planetary-production
```

### P1 Incidents (High Error Rate >5%)

**Investigation:**
```bash
# Analyze error distribution by subsystem
kubectl logs -l app=edge-gateway --tail=1000 | grep ERROR | awk '{print $8}' | sort | uniq -c | sort -nr

# Check for common error patterns
kubectl logs -l app=edge-gateway | grep "pool exhausted"
```

**Recovery:**
```bash
# Scale database pool
kubectl set env deployment/edge-gateway POSTGRES_POOL_SIZE=30 -n planetary-production

# Restart affected pods
kubectl delete pods -l app=edge-gateway,region=us-east-1 -n planetary-production
```

### P2 Incidents (Subsystem Adapter Failure)

**Detection:** Health check failures for specific adapters

**Investigation:**
```bash
# Check adapter health
kubectl logs -l app=edge-gateway | grep "adapter.*unhealthy"

# Test adapter connectivity
kubectl exec deployment/edge-gateway -n planetary-production -- curl http://adapter-service:8080/health
```

**Recovery:**
```bash
# Restart affected pods
kubectl delete pods -l app=edge-gateway -n planetary-production
```

## Monitoring Metrics

### Service Health Metrics
- **Pod Availability:** Target 99.999% (SLO)
- **Response Time P95:** Target < 50ms
- **Error Rate:** Target < 0.1%

### Business Metrics
- **Requests per Subsystem:** Track distribution across all 10 subsystems
- **Decision Distribution:** Allow/Block/Quarantine ratios
- **Risk Score Distribution:** Average and P95 risk scores
- **Policy Cache Hit Rate:** Target > 90%

### Key Dashboards
```bash
# Prometheus queries
rate(edge_gateway_requests_total[5m])
histogram_quantile(0.95, rate(edge_gateway_request_duration_bucket[5m]))
rate(edge_gateway_errors_total[5m]) / rate(edge_gateway_requests_total[5m])
```

## Troubleshooting

### Common Issues

**High Latency:**
- Check database connection pool saturation
- Verify policy cache hit rates
- Monitor external service dependencies (MARP, CSI)

**Memory Leaks:**
- Monitor heap usage trends
- Check for connection leaks
- Review garbage collection logs

**Signature Verification Failures:**
- Verify MARP public key validity
- Check timestamp freshness (< 5 minutes)
- Validate signature format and algorithm

**Cache Inconsistencies:**
- Force cache refresh: `kubectl exec deployment/edge-gateway -- /app/scripts/clear-cache.sh`
- Verify policy bundle integrity
- Check regional cache synchronization

This runbook ensures the Edge Gateway maintains planetary-scale reliability while enforcing MARP governance across all Pulsco operations.
