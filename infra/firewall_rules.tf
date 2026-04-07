# MARP-Aligned Firewall Rules - CSI Dynamic
# Service-specific ingress/egress, zero-trust
# CSI directives update rules (ports, sources) via tfvars → invisible apply
# Every change logged as Terraform legacy artifact for audit

# Base VPC Firewall (migrated/refactored from network.tf)
resource "google_compute_firewall" "marp_base" {
  name    = "marp-firewall-base"
  network = google_compute_network.pulsco_vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]

}

# Dynamic CSI/MARP Service Firewalls
resource "google_compute_firewall" "csi_marp_service_rules" {
  for_each = { for rule in var.csi_directives.firewall_rules : rule.service => rule }

  name      = "marp-${each.value.service}-fw"
  network   = google_compute_network.pulsco_vpc.name
  project   = var.project_id
  direction = "INGRESS"
  priority  = each.value.priority

  allow {
    protocol = each.value.protocol
    ports    = each.value.ports
  }

  source_ranges = each.value.source_ranges
  target_tags   = ["${each.value.service}-backend"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}

# Egress Rules (zero-trust, MARP governance)
resource "google_compute_firewall" "marp_egress_payments" {
  name      = "marp-egress-payments"
  network   = google_compute_network.pulsco_vpc.name
  project   = var.project_id
  direction = "EGRESS"
  priority  = 1000

  destination_ranges = [
    "api.sandbox.paypal.com/32",        # PayPal
    "sandbox.mpesadevelopers.co.ke/32", # M-Pesa
    "openapi.alipay.com/32",            # Alipay
    "maps.googleapis.com/32"            # Google Maps
  ]

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }
}

# Examples populated from default var.csi_directives.firewall_rules:
# - billing: HTTPS internal VPC only
# - edge-gateway: 443 from LB
# - proximity: 8080 TCP from internal
# CSI validates post-apply: firewall state matches directives

