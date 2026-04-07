# CSI → Terraform Directive Pipeline
## Indirect Collaboration Strategy (Intelligence → Execution)

**Flow**:
1. **CSI Ingests Telemetry**: Traffic, latency, compliance from GCP Monitoring/Pub/Sub.
2. **CSI Decides Directives**: JSON output e.g. `csi-directives.tfvars.json`.
3. **Pipeline Triggers**: Cloud Function/Eventarc on CSI Pub/Sub → generate tfvars.
4. **Terraform Apply**: GitHub Actions/Cloud Build w/ tfvars → apply invisibly.
5. **GCP Enforces**: Autoscalers, LB weights, firewall updated.
6. **CSI Validates**: Query GCP APIs, detect drift, correct via new directive.

**JSON Schema** (csi-directives.json → tfvars):
```
{
  "replicas": {"us":5, "eu":3},
  "cpu_targets": {"us":0.7},
  "routing_weights": {"us":0.4},
  "slo_latency_p95": 200,
  "firewall_rules": [{"service":"billing", "ports":[443]}]
}
```

**tfvars Generation Script** (pipeline):
```bash
jq -r 'to_entries|map("\(.key) = \(.value)") | join("\n")' csi-directives.json > terraform.tfvars
terraform plan -var-file=terraform.tfvars -out=tfplan
terraform apply tfplan
```

**Drift Reconciliation**:
- `terraform plan -detailed` output → custom metric.
- Alert if drift >0 → CSI re-directive.

**Governance**: All applies logged to MARP BigQuery sink. Zero direct Terraform interaction.

**Run**: `cd infra && terraform workspace select dev && terraform apply -var-file=csi-directives.tfvars`

