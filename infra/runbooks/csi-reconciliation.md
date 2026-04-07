# CSI Infra Reconciliation Runbook
**Periodic Drift Check**:
1. CSI queries GCP APIs (MIG size, LB weights, firewall).
2. Compare vs current csi_directives.
3. Drift → new directive → pipeline.

**Manual**:
```
cd infra
terraform plan -var-file=csi-directives.tfvars -detailed | grep '#'
```

**Auto**:
Cloud Scheduler → Cloud Function → tf plan → Pub/Sub if drift.

**Success Criteria**:
- All metrics match directives within 5%.
- SLO compliance 100%.

**Escalation**: MARP council via alerting.service.ts.

