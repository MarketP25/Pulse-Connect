resource "google_container_cluster" "pulsco_gke_main" {
  name     = "pulsco-gke-main"
  location = var.region
  project  = var.project_id
  release_channel {
    channel = "REGULAR"
  }
  initial_node_count = 1

  # Enable Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Network
  network    = google_compute_network.pulsco_vpc.name
  subnetwork = google_compute_subnetwork.pulsco_subnet.name

  # Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Shielded nodes
  node_config {
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
  }

  # Remove legacy auth (GKE RBAC)
  remove_default_node_pool = true
  enable_shielded_nodes    = true
  vertical_pod_autoscaling {
    enabled = true
  }

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods-range"
    services_secondary_range_name = "services-range"
  }
}

resource "google_container_node_pool" "pulsco_system_pool" {
  name       = "system"
  cluster    = google_container_cluster.pulsco_gke_main.name
  location   = var.region
  project    = var.project_id
  node_count = 2

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    service_account = google_service_account.pulsco_service_account.email
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 1
    max_node_count = 5
  }
}

resource "google_container_node_pool" "pulsco_services_pool" {
  name       = "services"
  cluster    = google_container_cluster.pulsco_gke_main.name
  location   = var.region
  project    = var.project_id
  node_count = 3

  node_config {
    machine_type = "e2-highcpu-8"
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    service_account = google_service_account.pulsco_service_account.email
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = 3
    max_node_count = 20
  }
}

# Service Account for GKE
resource "google_service_account" "pulsco_service_account" {
  account_id   = var.service_account_name
  display_name = "Pulsco GKE Service Account"
  project      = var.project_id
}

# Output cluster details
output "gke_cluster_endpoint" {
  value = google_container_cluster.pulsco_gke_main.endpoint
}

output "gke_cluster_ca_certificate" {
  value = google_container_cluster.pulsco_gke_main.master_auth.0.cluster_ca_certificate
}
