variable "service_account_name" {
  description = "The service account name (without domain)"
  type        = string
}

resource "google_service_account_iam_binding" "pulsco_users" {
  service_account_id = "projects/pulsco-global-ltd/serviceAccounts/${var.service_account_name}@pulsco-global-ltd.iam.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"

  members = [
    "user:tech-security@pulsco.global",
    "user:customer-experience@pulsco.global",
    "user:commercial-outreach@pulsco.global"
  ]
}

resource "google_service_account_iam_binding" "pulsco_admins" {
  service_account_id = "projects/pulsco-global-ltd/serviceAccounts/${var.service_account_name}@pulsco-global-ltd.iam.gserviceaccount.com"
  role               = "roles/iam.serviceAccountAdmin"

  members = [
    "user:superadmin@pulsco.global",
    "user:coo@pulsco.global",
    "user:business-ops@pulsco.global",
    "user:people-risk@pulsco.global",
    "user:procurement-partnerships@pulsco.global",
    "user:legal-finance@pulsco.global",
    "user:governance-registrar@pulsco.global",
    "user:dpo@pulsco.global"
  ]
}
