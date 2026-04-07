# Extended Monitoring - SLO/SLI + CSI Validation
# Uptime, latency, compliance alerts
# CSI ingests metrics → directives; validates post-apply
# Dashboards for MARP SLA/SLO, drift detection

# Uptime Check - Global LB (multi-region)
resource "google_monitoring_uptime_check_config" "csi_lb_uptime" {
  display_name = "CSI Global LB Uptime"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  http_check {
    request_method = "GET"
    path           = "/health"
    port           = 80
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      host = google_compute_global_forwarding_rule.pulsco_forwarding_rule.ip_address
    }
  }

  content_matchers {
    content = "OK"
  }
}

# Latency Alert (SLI 95th < csi_directives.slo_latency_p95)
resource "google_monitoring_alert_policy" "csi_latency_slo" {
  display_name = "CSI Latency SLO Violation"
  combiner     = "OR"
  project      = var.project_id
  enabled      = true

  conditions {
    display_name = "Proximity Latency 95th Percentile"
    condition_threshold {
      filter          = "metric.type=\"loadbalancing.googleapis.com|load_balancer|/http/request/latency\" resource.type=\"global_load_balancer\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.csi_directives.slo_latency_p95 / 1000 # seconds
      duration        = "300s"
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_PERCENTILE_95"
      }
    }
  }

  notification_channels = [] # Add MARP channels
}

# Uptime SLO Alert
resource "google_monitoring_alert_policy" "csi_uptime_slo" {
  combiner     = "OR"
  display_name = "CSI Uptime SLO Violation"
  project      = var.project_id

  conditions {
    display_name = "Global LB Uptime"
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed_ratio\""
      comparison      = "COMPARISON_LT"
      threshold_value = var.csi_directives.slo_uptime / 100
      duration        = "900s" # 15min
    }
  }
}

# SLO Dashboard
resource "google_monitoring_dashboard" "csi_slo_dashboard" {
  dashboard_json = jsonencode({
    displayName = "CSI Infra SLO Dashboard"
    tiles = [
      {
        title = "Latency p95 vs SLO"
        sloInfo = {
          sloId = "csi-latency-slo"
        }
      },
      {
        title = "Uptime SLO"
        sloInfo = {
          sloId = "csi-uptime-slo"
        }
      }
    ]
    # Full JSON dashboard config (abbrev)
  })
}

# Drift Alert (Terraform state vs GCP)
# Use custom metric from terraform plan output or Atlantis/Atlan
resource "google_monitoring_alert_policy" "csi_drift" {
  combiner     = "OR"
  display_name = "CSI Infra Drift Detected"
  project      = var.project_id

  conditions {
    display_name = "Terraform Drift"
    condition_threshold {
      filter          = "metric.type=\"custom.googleapis.com/terraform/drift\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "300s"
    }
  }
}

# Integrate with existing monitoring.tf high_cpu

