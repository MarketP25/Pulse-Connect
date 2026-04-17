csi_directives = {
  replicas = {
    us = 20
    eu = 15
    asia = 10
    africa = 5
    gke = 20  # Phase1: Planetary min nodes
    "gke-canary" = 1
  }
  min_replicas = {
    us = 20
    eu = 15
    asia = 10
    africa = 5
    gke = 20  # Phase1 min; Phase2=100, Phase3=1000
    "gke-canary" = 1
  }
  max_replicas = {
    us = 100
    eu = 80
    asia = 50
    africa = 30
    gke = 100  # Phase1 max; ramp Phase2=1000, Phase3=10000 for 40B+ users
    "gke-canary" = 3
  }
  cpu_targets = {
    us = 0.6
    eu = 0.65
    asia = 0.7
    africa = 0.65
    gke = 0.6
  }
  routing_weights = {
    us = 0.4
    eu = 0.3
    asia = 0.2
    africa = 0.1
  }
  slo_latency_p95 = 150  # ms, tightened for scale
  slo_uptime = 99.99
  firewall_rules = [
    {
      service = "edge-gateway"
      protocol = "tcp"
      ports = [443]
      source_ranges = ["10.0.0.0/16"]  # Internal VPC only
      priority = 1000
    },
    {
      service = "billing"
      protocol = "tcp"
      ports = [443]
      source_ranges = ["10.0.0.0/16"]
      priority = 1001
    }
  ]
}

# MARP Annotation: pulsco-founder-approved-planetary-phase1-2024-v1.0
# Audit Trail: CSI Directive Phase 1 for 40B+ scale, Zero Trust extended
