resource "google_secret_manager_secret" "pulsco_api_keys" {
  secret_id = "pulsco-api-keys"
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
  project = var.project_id
}

resource "google_secret_manager_secret_version" "pulsco_api_keys_version" {
  secret      = google_secret_manager_secret.pulsco_api_keys.id
  secret_data = base64encode(local.pulsco_generic_payload)
}
