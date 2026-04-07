# Multi-region Proximity Backend MIGs for autoscaling with traffic spikes
# Collaborates with Proximity Powerhouse vX100 via VPC/LB path-routing

# Include infra/migs.tf for full definitions

# Backend services linking MIGs to global LB (add to global_lb.tf backend_service block)
resource "google_compute_backend_service" "proximity_us" {
  name        = "proximity-us-backend"
  project     = var.project_id
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30
  connection_draining {
    draining_timeout_sec = 300
  }
  health_checks = [google_compute_health_check.proximity_hc.self_link]

  backend {
    group           = google_compute_instance_group_manager.us_proximity_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
    max_utilization = 0.8
  }
}

# Similar backends for eu_proximity_mig, asia_proximity_mig, africa_proximity_mig

# Regional health check
resource "google_compute_health_check" "proximity_hc" {
  name                = "proximity-health-check"
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
