resource "google_storage_bucket" "pulsco_bucket" {
  name          = "pulsco-global-storage-${var.project_id}"
  location      = "US"
  force_destroy = false
  project       = var.project_id
}

resource "google_storage_bucket_iam_binding" "pulsco_bucket_admins" {
  bucket = google_storage_bucket.pulsco_bucket.name
  role   = "roles/storage.admin"

  members = [
    "user:superadmin@pulsco.global",
    "user:legal-finance@pulsco.global"
  ]
}

resource "google_storage_bucket_iam_binding" "pulsco_bucket_users" {
  bucket = google_storage_bucket.pulsco_bucket.name
  role   = "roles/storage.objectViewer"

  members = [
    "user:customer-experience@pulsco.global",
    "user:commercial-outreach@pulsco.global"
  ]
}
