# GCP Pub/Sub for CSI events (Kafka equivalent)
resource "google_pubsub_topic" "csi_events" {
  name = "csi-events-topic"
  labels = {
    service = "csi"
  }
}

resource "google_pubsub_topic" "emergency_broadcast" {
  name = "emergency-broadcast"
  labels = {
    service = "governance"
    criticality = "emergency"
  }
}

resource "google_pubsub_subscription" "csi_consumers" {
  name  = "csi-event-consumers"
  topic = google_pubsub_topic.csi_events.name

  ack_deadline_seconds = 30
  message_retention_duration = "604800s"  # 7 days
}

output "kafka_bootstrap_servers" {
  value = "csi-events-topic"  # Use Pub/Sub connector for Kafka compat
}

# Cloud Function for Terraform directive from CSI
resource "google_cloudfunctions2_function" "csi_directive_pipeline" {
  name        = "csi-directive-pipeline"
  location    = var.region
  description = "CSI → Terraform directive pipeline"

  build_config {
    runtime     = "nodejs20"
    entry_point = "terraformDirectiveHandler"
    source {
      storage_source {
        bucket = google_storage_bucket.csi_artifacts.name
        object = "source.zip"
      }
    }
  }

  service_config {
    available_memory   = "512Mi"
    timeout_seconds    = 540
    service_account_email = google_service_account.csi_pipeline.email
    runtimes {
      name = "nodejs20"
    }
  }

  event_trigger {
    trigger_region = "us-central1"
    event_type     = "google.cloud.pubsub.topic.publish"
    pubsub_trigger {
      topic = google_pubsub_topic.csi_directives.id
    }
  }
}
