# Multi-Region Proximity Backends for Global LB
# CSI-driven routing weights and validation
# Path-based: /us/* → us-backend (proximity), weights from csi_directives.routing_weights
# Integrates with migs.tf MIGs and global_lb.tf url_map

# Global Health Check (shared)
resource "google_compute_health_check" "csi_proximity_hc" {
  name                = "csi-proximity-health-check"
  project             = var.project_id
  timeout_sec         = 5
  check_interval_sec  = 10
  unhealthy_threshold = 3
  healthy_threshold   = 2

  http_health_check {
    port         = 8080
    request_path = "/health"
    proxy_header = "NONE"
  }
}

# US Backend Service (links to us_proximity_mig)
resource "google_compute_backend_service" "csi_proximity_us" {
  name        = "csi-proximity-us-backend"
  project     = var.project_id
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  connection_draining {
    draining_timeout_sec = 300
  }
  health_checks    = [google_compute_health_check.csi_proximity_hc.self_link]
  session_affinity = "NONE"

  backend {
    group           = google_compute_instance_group_manager.us_proximity_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
    max_utilization = var.csi_directives.cpu_targets["us"]
  }
}

# EU Backend
resource "google_compute_backend_service" "proximity_eu" {
  name        = "csi-proximity-eu-backend"
  project     = var.project_id
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  connection_draining {
    draining_timeout_sec = 300
  }
  health_checks = [google_compute_health_check.csi_proximity_hc.self_link]

  backend {
    group           = google_compute_instance_group_manager.eu_proximity_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
    max_utilization = var.csi_directives.cpu_targets["eu"]
  }
}

# Asia Backend
resource "google_compute_backend_service" "proximity_asia" {
  name        = "csi-proximity-asia-backend"
  project     = var.project_id
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  connection_draining {
    draining_timeout_sec = 300
  }
  health_checks = [google_compute_health_check.csi_proximity_hc.self_link]

  backend {
    group           = google_compute_instance_group_manager.asia_proximity_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
    max_utilization = var.csi_directives.cpu_targets["asia"]
  }
}

# Africa Backend
resource "google_compute_backend_service" "proximity_africa" {
  name        = "csi-proximity-africa-backend"
  project     = var.project_id
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  connection_draining {
    draining_timeout_sec = 300
  }
  health_checks = [google_compute_health_check.csi_proximity_hc.self_link]

  backend {
    group           = google_compute_instance_group_manager.africa_proximity_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
    max_utilization = var.csi_directives.cpu_targets["africa"]
  }
}

# Note: Add path rules to global_lb.tf url_map:
# path_matcher {
#   name            = "proximity-routes"
#   default_service = google_compute_backend_service.proximity_us.self_link
# 
#   path_rule {
#     paths   = ["/us/*"]
#     service = google_compute_backend_service.proximity_us.self_link
#   }
#   path_rule {
#     paths   = ["/eu/*"]
#     service = google_compute_backend_service.proximity_eu.self_link
#   }
#   # etc.
# }
# CSI will update weights via directives → tfvars → apply.

