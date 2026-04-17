# Global Anycast IP for Planetary Orchestration
resource "google_compute_global_address" "gso_anycast_ip" {
  name         = "pulsco-gso-anycast-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
  project      = var.project_id
}

# GSO Edge Policy (WAF/Cloud Armor integration)
resource "google_compute_security_policy" "gso_containment_policy" {
  name        = "gso-emergency-containment-policy"
  description = "MARP-governed containment policy for planetary isolation"
  project     = var.project_id

  # Managed by GSO Service to block regional IP ranges during Level 3
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }
}

# Output for GSO Engine Configuration
output "gso_entry_point" {
  value       = google_compute_global_address.gso_anycast_ip.address
  description = "Planetary entry point for all PULSCO traffic"
}