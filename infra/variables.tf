variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
  default     = "pulsco-global-ltd"
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "us-central1"
}



# === CSI Intelligence Layer Variables ===
# CSI Directives: JSON-parsed object from Central Super Intelligence telemetry/decision output
# Example CSI JSON: {"replicas":{"us":5,"eu":3},"cpu_targets":{"us":0.7},"routing_weights":{"us":0.4,"eu":0.3,"asia":0.2,"africa":0.1},"slo_latency_p95":200,"firewall_marp_rules":[{"service":"billing","ports":[443],"source_ranges":["10.0.0.0/16"]}]}
variable "csi_directives" {
  description = "CSI scaling/routing/firewall/SLO directives (parsed from JSON)"
  type = object({
    replicas        = map(number) # e.g. {"us":5, "eu":3, "asia":2, "africa":1}
    cpu_targets     = map(number) # 0.0-1.0
    max_replicas    = map(number)
    min_replicas    = map(number)
    routing_weights = map(number) # sum to 1.0 for LB
    slo_latency_p95 = number      # ms
    slo_uptime      = number      # % 
    firewall_rules = list(object({
      service       = string
      protocol      = string
      ports         = list(number)
      source_ranges = list(string)
      priority      = number
    }))
  })
  default = {
    replicas        = { us = 3, eu = 3, asia = 3, africa = 3 }
    cpu_targets     = { us = 0.65, eu = 0.65, asia = 0.65, africa = 0.65 }
    max_replicas    = { us = 15, eu = 15, asia = 15, africa = 15 }
    min_replicas    = { us = 2, eu = 2, asia = 2, africa = 2 }
    routing_weights = { us = 0.4, eu = 0.3, asia = 0.2, africa = 0.1 }
    slo_latency_p95 = 250
    slo_uptime      = 99.9
    firewall_rules  = []
  }
}

# Region configurations for multi-region deployment
variable "region_configs" {
  description = "Multi-region zones and settings"
  type = map(object({
    zone        = string
    subnet_cidr = string
  }))
  default = {
    us     = { zone = "us-central1-a", subnet_cidr = "10.0.1.0/24" }
    eu     = { zone = "europe-west4-a", subnet_cidr = "10.0.2.0/24" }
    asia   = { zone = "asia-southeast1-b", subnet_cidr = "10.0.3.0/24" }
    africa = { zone = "africa-south1-a", subnet_cidr = "10.0.4.0/24" }
  }
}

# Payment API secrets placeholders (rotate via secrets_rotation.tf)
variable "payment_api_secrets" {
  description = "Payment API secrets map (loaded from .env.local via data.external/local.payment_api_secrets or override)"
  type        = map(string)
  sensitive   = true
}

variable "env_file" {
  description = "Path to .env.local file"
  type        = string
  default     = ".env.local"
}

