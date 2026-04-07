# Multi-Region Proximity Backend MIGs + Autoscalers
# Autoscales with traffic spikes, collaborates with Proximity Powerhouse vX100 backend via VPC/internal LB

# US
resource "google_compute_instance_template" "us_proximity" {
  name_prefix      = "us-proximity-template-"
  machine_type     = "e2-medium"
  project          = var.project_id
  min_cpu_platform = "Intel Ice Lake"

  disk {
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-standard"
    source_image = "debian-cloud/debian-12"
  }

  network_interface {
    network    = google_compute_network.pulsco_vpc.id
    subnetwork = google_compute_subnetwork.pulsco_subnet.id
    access_config {
      # Ephemeral public IP
    }
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y docker.io docker-compose nginx
      systemctl enable docker nginx
      # Clone/deploy proximity services
      git clone https://github.com/pulsco/proximity-powerhouse-vX100 /opt/proximity
      cd /opt/proximity && docker-compose up -d
      EOF
    enable-oslogin = "TRUE"
  }

  scheduling {
    on_host_maintenance = "MIGRATE"
    automatic_restart   = true
    preemptible         = false
  }

  tags = ["proximity-backend", "us"]
}

resource "google_compute_instance_group_manager" "us_proximity_mig" {
  name               = "us-proximity-mig"
  base_instance_name = "us-proximity-vm"
  zone               = "us-central1-a"
  project            = var.project_id

  version {
    instance_template = google_compute_instance_template.us_proximity.self_link
  }

  target_size = 3
}

resource "google_compute_autoscaler" "us_proximity_asg" {
  name    = "us-proximity-autoscaler"
  zone    = "us-central1-a"
  target  = google_compute_instance_group_manager.us_proximity_mig.self_link
  project = var.project_id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 15
    cooldown_period = 60

    cpu_utilization {
      target = 0.65
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}

# EU
resource "google_compute_instance_template" "eu_proximity" {
  name_prefix      = "eu-proximity-template-"
  machine_type     = "e2-medium"
  project          = var.project_id
  min_cpu_platform = "Intel Ice Lake"

  disk {
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    source_image = "debian-cloud/debian-12"
  }

  network_interface {
    network    = google_compute_network.pulsco_vpc.id
    subnetwork = google_compute_subnetwork.pulsco_subnet.id
    access_config {}
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y docker.io docker-compose nginx
      systemctl enable docker nginx
      git clone https://github.com/pulsco/proximity-powerhouse-vX100 /opt/proximity
      cd /opt/proximity && docker-compose up -d
      EOF
    enable-oslogin = "TRUE"
  }

  scheduling {
    on_host_maintenance = "MIGRATE"
    automatic_restart   = true
    preemptible         = false
  }

  tags = ["proximity-backend", "eu"]
}

resource "google_compute_instance_group_manager" "eu_proximity_mig" {
  name               = "eu-proximity-mig"
  base_instance_name = "eu-proximity-vm"
  zone               = "europe-west4-a"
  project            = var.project_id

  version {
    instance_template = google_compute_instance_template.eu_proximity.self_link
  }

  target_size = 3
}

resource "google_compute_autoscaler" "eu_proximity_asg" {
  name    = "eu-proximity-autoscaler"
  zone    = "europe-west4-a"
  target  = google_compute_instance_group_manager.eu_proximity_mig.self_link
  project = var.project_id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 15
    cooldown_period = 60

    cpu_utilization {
      target = 0.65
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}

# ASIA (asia-southeast1)
resource "google_compute_instance_template" "asia_proximity" {
  name_prefix  = "asia-proximity-template-"
  machine_type = "e2-medium"
  project      = var.project_id

  disk {
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    source_image = "debian-cloud/debian-12"
  }

  network_interface {
    network    = google_compute_network.pulsco_vpc.id
    subnetwork = google_compute_subnetwork.pulsco_subnet.id
    access_config {}
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y docker.io docker-compose nginx
      systemctl enable docker nginx
      git clone https://github.com/pulsco/proximity-powerhouse-vX100 /opt/proximity
      cd /opt/proximity && docker-compose up -d
      EOF
    enable-oslogin = "TRUE"
  }

  scheduling {
    on_host_maintenance = "MIGRATE"
    automatic_restart   = true
    preemptible         = false
  }

  tags = ["proximity-backend", "asia"]
}

resource "google_compute_instance_group_manager" "asia_proximity_mig" {
  name               = "asia-proximity-mig"
  base_instance_name = "asia-proximity-vm"
  zone               = "asia-southeast1-b"
  project            = var.project_id

  version {
    instance_template = google_compute_instance_template.asia_proximity.self_link
  }

  target_size = 3
}

resource "google_compute_autoscaler" "asia_proximity_asg" {
  name    = "asia-proximity-autoscaler"
  zone    = "asia-southeast1-b"
  target  = google_compute_instance_group_manager.asia_proximity_mig.self_link
  project = var.project_id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 15
    cooldown_period = 60

    cpu_utilization {
      target = 0.65
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}

# AFRICA (africa-south1)
resource "google_compute_instance_template" "africa_proximity" {
  name_prefix  = "africa-proximity-template-"
  machine_type = "e2-medium"
  project      = var.project_id

  disk {
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
    source_image = "debian-cloud/debian-12"
  }

  network_interface {
    network    = google_compute_network.pulsco_vpc.id
    subnetwork = google_compute_subnetwork.pulsco_subnet.id
    access_config {}
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y docker.io docker-compose nginx
      systemctl enable docker nginx
      git clone https://github.com/pulsco/proximity-powerhouse-vX100 /opt/proximity
      cd /opt/proximity && docker-compose up -d
      EOF
    enable-oslogin = "TRUE"
  }

  scheduling {
    on_host_maintenance = "MIGRATE"
    automatic_restart   = true
    preemptible         = false
  }

  tags = ["proximity-backend", "africa"]
}

resource "google_compute_instance_group_manager" "africa_proximity_mig" {
  name               = "africa-proximity-mig"
  base_instance_name = "africa-proximity-vm"
  zone               = "africa-south1-a"
  project            = var.project_id

  version {
    instance_template = google_compute_instance_template.africa_proximity.self_link
  }

  target_size = 3
}

resource "google_compute_autoscaler" "africa_proximity_asg" {
  name    = "africa-proximity-autoscaler"
  zone    = "africa-south1-a"
  target  = google_compute_instance_group_manager.africa_proximity_mig.self_link
  project = var.project_id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 15
    cooldown_period = 60

    cpu_utilization {
      target = 0.65
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}

# Backend services for LB (add to global_lb.tf)
resource "google_compute_region_backend_service" "proximity_us" {
  name                  = "proximity-us-backend"
  region                = "us-central1"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "INTERNAL"
  timeout_sec           = 30
  health_checks         = [google_compute_region_health_check.proximity_hc.self_link]

  backend {
    group           = google_compute_instance_group_manager.us_proximity_mig.instance_group
    balancing_mode  = "RATE"
    capacity_scaler = 1.0
  }
}

# Similar for EU/Asia/Africa + global LB path-based routing to regions based on Proximity Powerhouse vX100
# Health check
resource "google_compute_region_health_check" "proximity_hc" {
  name                = "proximity-health-check"
  region              = var.region
  project             = var.project_id
  check_interval_sec  = 15
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 6

  http_health_check {
    port         = 8080
    request_path = "/health"
  }
}

