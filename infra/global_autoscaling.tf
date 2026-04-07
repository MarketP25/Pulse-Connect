# Global Autoscaling - CSI-Driven
# Parametrized MIG and GKE autoscalers
# CSI directives control min/max_replicas, cpu_targets via tfvars
# Migrated/refactored from migs.tf (legacy hardcoded) and gke.tf node_pools
# Invisible execution layer; CSI ingests telemetry → directives → Terraform apply → GCP enforces → CSI validates

locals {
  regions = ["us", "eu", "asia", "africa"]
}

# MIG Autoscalers (ref MIGs from migs.tf)
resource "google_compute_autoscaler" "csi_proximity_asg" {
  for_each = toset(local.regions)

  name   = "csi-proximity-${each.key}-autoscaler"
  zone   = var.region_configs[each.key].zone
  target = google_compute_instance_group_manager["${each.key}_proximity_mig"][0].instance_group
  project = var.project_id

  autoscaling_policy {
    min_replicas    = var.csi_directives.min_replicas[each.key]
    max_replicas    = var.csi_directives.max_replicas[each.key]
    cooldown_period = 60

    cpu_utilization {
      target = var.csi_directives.cpu_targets[each.key]
    }

    load_balancing_utilization {
      target = 0.8
    }
  }
}

# GKE Cluster Autoscaler (add to gke.tf cluster)
resource "google_container_cluster" "pulsco_gke_main_with_csi" {
  name = "pulsco-gke-main-with-csi"
  # Note: Update gke.tf to use this or merge
}

# Node Pool Autoscalers (parametrized from gke.tf)
resource "google_container_node_pool" "csi_services_pool" {
  name       = "csi-services"
  cluster    = google_container_cluster.pulsco_gke_main.name
  location   = var.region
  project    = var.project_id
  initial_node_count = coalesce(var.csi_directives.replicas["default"], 3)

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  autoscaling {
    min_node_count = var.csi_directives.min_replicas["gke"]
    max_node_count = var.csi_directives.max_replicas["gke"]
  }

  node_config {
    # ... existing
  }
}

# Custom Metric Scaling Example (CSI telemetry e.g. latency)
resource "google_monitoring_metric_descriptor" "csi_latency_metric" {
  metric_kind = "GAUGE"
  value_type  = "DOUBLE"
  type = "GAUGE"
  unit = "ms"
  labels {
    key         = "region"
    value_type  = "STRING"
    description = "Proximity region"
  }
  project = var.project_id
}

# Autoscaler uses custom metric (extend in production)
# CSI → Pub/Sub → custom metric → autoscaler target 95th p95 < var.csi_directives.slo_latency_p95

# Drift Detection Output
output "current_csi_directives_hash" {
  value = md5(jsonencode(var.csi_directives))
}

