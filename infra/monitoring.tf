resource "google_monitoring_alert_policy" "high_cpu" {
  display_name = "High CPU usage - pulsco-app"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "VM instance CPU usage"
    condition_threshold {
      filter          = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.85
      duration        = "60s"
      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = []
}
