resource "google_dns_managed_zone" "pulsco_zone" {
  name        = "pulsco-zone"
  dns_name    = "pulsco.global."
  description = "Managed DNS zone for Pulsco Global Ltd"
  project     = var.project_id
}

resource "google_dns_record_set" "pulsco_a_record" {
  name         = "pulsco.global."
  type         = "A"
  ttl          = 300
  managed_zone = google_dns_managed_zone.pulsco_zone.name
  project      = var.project_id

  rrdatas = [google_compute_global_address.pulsco_lb_ip.address]
}
