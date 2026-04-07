resource "google_compute_global_address" "pulsco_lb_ip" {
  name    = "pulsco-global-ip"
  project = var.project_id
}

resource "google_compute_backend_service" "pulsco_backend" {
  name        = "pulsco-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  project = var.project_id

  # Enable Cloud CDN
  enable_cdn = true
}

resource "google_compute_url_map" "pulsco_url_map" {
  name            = "pulsco-url-map"
  default_service = google_compute_backend_service.pulsco_backend.self_link
  project         = var.project_id

  path_matcher {
    name            = "csi-proximity-matcher"
    default_service = google_compute_backend_service.proximity_us.self_link

    path_rule {
      paths   = ["/us/*", "/usa/*"]
      service = google_compute_backend_service.proximity_us.self_link
    }

    path_rule {
      paths   = ["/eu/*", "/europe/*"]
      service = google_compute_backend_service.proximity_eu.self_link
    }

    path_rule {
      paths   = ["/asia/*", "/ap/*"]
      service = google_compute_backend_service.proximity_asia.self_link
    }

    path_rule {
      paths   = ["/africa/*", "/af/*"]
      service = google_compute_backend_service.proximity_africa.self_link
    }

    # CSI weights applied via backend capacity_scaler in multi_region_backends.tf
  }
}

resource "google_compute_target_http_proxy" "pulsco_http_proxy" {
  name    = "pulsco-http-proxy"
  url_map = google_compute_url_map.pulsco_url_map.self_link
  project = var.project_id
}

resource "google_compute_global_forwarding_rule" "pulsco_forwarding_rule" {
  name       = "pulsco-http-forwarding-rule"
  ip_address = google_compute_global_address.pulsco_lb_ip.address
  port_range = "80"
  target     = google_compute_target_http_proxy.pulsco_http_proxy.self_link
  project    = var.project_id
}

# Cloud Armor security policy
resource "google_compute_security_policy" "pulsco_armor_policy" {
  name    = "pulsco-armor-policy"
  project = var.project_id

  rule {
    action   = "allow"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["0.0.0.0/0"]
      }
    }
    description = "Allow all by default"
  }

  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["203.0.113.0/24"] # Example: block suspicious subnet
      }
    }
    description = "Block known bad subnet"
  }
}

# Attach Cloud Armor policy to backend
resource "null_resource" "pulsco_backend_armor" {
}
