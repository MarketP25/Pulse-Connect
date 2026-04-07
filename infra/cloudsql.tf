resource "google_sql_database_instance" "pulsco_db_main" {
  name             = "pulsco-db-main"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    # High Availability
    availability_type = "REGIONAL"
    tier              = "db-f1-micro" # Start small, scale later

    # Networking
    ip_configuration {
      ipv4_enabled    = true
      private_network = google_compute_network.pulsco_vpc.id
      ssl_mode        = "REQUIRE_SSL"
    }

    # Backup
    backup_configuration {
      enabled                        = true
      location                       = var.region
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }

    # Maintenance
    maintenance_window {
      day  = 7 # Sunday
      hour = 3
    }

    # Disk
    disk_autoresize = true
    disk_size       = 20
    disk_type       = "PD_SSD"
  }

  deletion_protection = false
}

resource "google_sql_database" "pulsco_db" {
  name     = "pulsco"
  project  = var.project_id
  instance = google_sql_database_instance.pulsco_db_main.name
}

resource "google_sql_user" "pulsco_db_user" {
  name     = "pulsco"
  project  = var.project_id
  instance = google_sql_database_instance.pulsco_db_main.name
  password = random_password.db_password.result
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# CloudSQL Proxy Service Account (for k8s Workload Identity)
resource "google_service_account_iam_member" "cloudsql_client" {
  service_account_id = google_service_account.pulsco_service_account.name
  role               = "roles/cloudsql.client"
  member             = "serviceAccount:${google_service_account.pulsco_service_account.email}"
}

# Outputs
output "cloudsql_connection_name" {
  value       = google_sql_database_instance.pulsco_db_main.connection_name
  description = "CloudSQL instance connection string for CloudSQL Proxy"
}

output "cloudsql_private_ip" {
  value = google_sql_database_instance.pulsco_db_main.private_ip_address
}

output "db_password" {
  value     = random_password.db_password.result
  sensitive = true
}
