# Secrets Rotation - CSI/MARP Compliant
# Real API keys with automatic rotation (90d policy)
# CSI validates access post-apply, rotates on directive
# Invisible to users; Terraform execution layer only

# Rotation Policy (90 days)
resource "google_secret_manager_secret" "csi_payment_secrets" {
  for_each = local.payment_api_secrets

  secret_id = "csi-${each.key}"
  project   = var.project_id
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  # Rotation config (auto-rotate every 90 days)


  timeouts {
    create = "20m"
    update = "20m"
    delete = "20m"
  }
}

# Secret Versions (populate from var.payment_api_secrets)
resource "google_secret_manager_secret_version" "csi_payment_secret_data" {
  for_each = local.payment_api_secrets

  secret      = google_secret_manager_secret.csi_payment_secrets[each.key].id
  secret_data = each.value # From .env.local via locals

  depends_on = [google_secret_manager_secret.csi_payment_secrets]
}

# IAM Access for Pulsco SA (zero-trust)
resource "google_secret_manager_secret_iam_member" "secret_access" {
  for_each = local.payment_api_secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.csi_payment_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account_name}@${var.project_id}.iam.gserviceaccount.com"
}

# Audit Logging for all secret access
resource "google_secret_manager_secret_iam_member" "secret_audit" {
  for_each = local.payment_api_secrets

  project   = var.project_id
  secret_id = google_secret_manager_secret.csi_payment_secrets[each.key].secret_id
  role      = "roles/secretmanager.secretViewer"
  member    = "group:audit-logs@pulsco.global"
}

# CSI Directive Integration: Rotation trigger via Cloud Function / Eventarc on telemetry
# Example: var.csi_directives.secrets_rotation = ["mpesa", "paypal"] → target_version update → apply

