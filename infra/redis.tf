terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

# GCP Memorystore for Redis (high availability)
resource "google_redis_instance" "proximity_cache" {
  name               = "proximity-cache"
  region             = var.region
  memory_size_gb     = 1
  authorized_network = google_compute_network.main.id
  redis_version      = "REDIS_7_0"

  customer_managed_key = null  # Use if KMS needed

  location_id = var.region
  alternative_location_id = var.secondary_region

  labels = {
    service = "proximity"
    tier = "production"
  }
}

output "redis_connection" {
  value = google_redis_instance.proximity_cache.host
}
