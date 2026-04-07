# MARP Registry Governance Notes
**CSI-Terraform Alignment**:
- IAM bindings validated vs MARP registry (compliance_policies.tf).
- Scaling events logged as legacy artifacts (tfstate + audit sink).
- Zero-trust: public IPs disabled, secrets rotated, firewall dynamic.
- Audit: DLP on PII/payments, org policies enforced.

**SLA/SLO**:
- Uptime 99.9%, Latency p95 <250ms (csi_directives).
- Every directive logged.

**Validation**:
- Post-apply: CSI queries GCP APIs vs directives.
- Drift → auto-correct.

**Registry Entry**:
Approved for Pulsco Global Ltd planetary scale.

