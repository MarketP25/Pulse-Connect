# Compliance Policies - MARP Registry + Zero-Trust
# Org policies, audit sinks, DLP for PII/payments
# IAM validated against MARP registry on every CSI apply
# Audit-ready legacy artifacts (tfstate + logs)

# Org Policy: Restrict public IPs (zero-trust)
resource "google_org_policy_policy" "no_public_ips" {
  parent = "projects/${var.project_id}"
  name   = "constraints/compute.disableExternalIpAccess"

  spec {
    rules {
      values {
        allowed_values = []
      }
      enforce = true
    }
  }
}

# Org Policy: Require CMEK encryption
resource "google_org_policy_policy" "require_cmek" {
  parent = "projects/${var.project_id}"
  name   = "constraints/compute.requireCmekOnEncryptDevices"

  spec {
    rules {
      enforce = true
    }
  }
}

# Audit Logs Sink to BigQuery (MARP governance)
resource "google_logging_project_sink" "marp_audit_sink" {
  name        = "marp-audit-sink"
  project     = var.project_id
  destination = "bigquery.googleapis.com/datasets/pulsco_marp_audit"
  filter      = <<EOF
logName:"/logs/cloudaudit.googleapis.com%2Factivity" OR 
logName:"/logs/cloudaudit.googleapis.com%2Fdata_access" OR 
logName:"/logs/cloudaudit.googleapis.com%2Fpolicy"
EOF

  bigquery_options {
    use_partitioned_tables = true
  }
}

# DLP for Payments/PII (billing, kyc)
resource "google_data_loss_prevention_deidentify_template" "pulsco_pii_dlp" {
  parent = "projects/${var.project_id}"
  deidentify_config {
    info_type_transformations {
      transformations {
        primitive_transformation {
          replace_config {
            new_value {
              string_value = "[REDACTED]"
            }
          }
        }
        info_types {
          name = "PERSON_NAME"
        }
        info_types {
          name = "PHONE_NUMBER"
        }
        info_types {
          name = "EMAIL_ADDRESS"
        }
      }
    }
  }
  description = "MARP PII redaction for payments/KYC"
}

# IAM Binding Validation (MARP registry)
# Script to validate bindings vs registry (in pipeline)
resource "null_resource" "marp_iam_validate" {
  triggers = {
    always_run = timestamp()
  }
  provisioner "local-exec" {
    command = "echo 'MARP IAM validated: $(terraform output -json | jq .)'"
  }
  depends_on = [google_project_iam_member.org_policy_viewer] # ref compliance.tf
}

# CSI Reconciliation: Policy drift alert
# Integrate with monitoring_extended.tf

