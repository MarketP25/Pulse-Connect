resource "google_compute_network" "pulsco_vpc" {
  name                    = "pulsco-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "pulsco_subnet" {
  name          = "pulsco-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.pulsco_vpc.id
  project       = var.project_id
}

resource "google_compute_firewall" "marp_firewall" {
  name    = "marp-firewall"
  network = google_compute_network.pulsco_vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
}
