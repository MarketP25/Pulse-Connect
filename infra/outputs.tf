output "service_account_iam_users" {
  description = "Service account users members"
  value       = google_service_account_iam_binding.pulsco_users.members
}

output "service_account_iam_admins" {
  description = "Service account admins members"
  value       = google_service_account_iam_binding.pulsco_admins.members
}

output "storage_bucket_name" {
  description = "Primary storage bucket name"
  value       = google_storage_bucket.pulsco_bucket.name
}

# === CSI Outputs ===
output "csi_proximity_backend_status" {
  description = "Backend health status"
  value = {
    us     = google_compute_backend_service.proximity_us.status
    eu     = google_compute_backend_service.proximity_eu.status
    asia   = google_compute_backend_service.proximity_asia.status
    africa = google_compute_backend_service.proximity_africa.status
  }
}

output "csi_autoscaler_current_replicas" {
  description = "Current MIG replicas vs directives"
  value       = { for r in ["us", "eu", "asia", "africa"] : r => google_compute_autoscaler.csi_proximity_asg[r].current_num_replicas }
}

output "csi_directives_hash" {
  description = "Hash of applied CSI directives for drift detection"
  value       = md5(jsonencode(var.csi_directives))
}

output "global_lb_ip" {
  value = google_compute_global_address.pulsco_lb_ip.address
}

