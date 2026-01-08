###############################################
# Edge Gateway Terraform Stack (PostgreSQL + optional K8s Secret/Ingress)
#
# Purpose
# - Provision a production-ready managed PostgreSQL instance (AWS RDS) for the Edge Gateway
# - Optionally create a Kubernetes Secret containing DATABASE_URL for the edge deployment
# - Optionally create a Kubernetes Ingress with TLS and external-dns annotations
# - Optionally create a dedicated RDS Security Group with controlled ingress
#
# Assumptions
# - You already have a VPC with private subnets for RDS
# - If creating a new DB Security Group, you must provide vpc_id
# - You already have a Kubernetes cluster and local kubeconfig if you enable K8s resources
# - Your AWS credentials are configured locally (env vars or ~/.aws credentials)
#
# Usage (Windows CMD examples)
#   terraform -chdir=infra/terraform/edge init
#   terraform -chdir=infra/terraform/edge plan \
#     -var "db_username=edge_user" \
#     -var "subnet_ids=[\"subnet-abc\",\"subnet-def\"]" \
#     -var "vpc_security_group_ids=[\"sg-123\"]"
#   terraform -chdir=infra/terraform/edge apply -auto-approve \
#     -var "db_username=edge_user" \
#     -var "subnet_ids=[\"subnet-abc\",\"subnet-def\"]" \
#     -var "vpc_security_group_ids=[\"sg-123\"]"
#
# Optional (K8s secret):
#   -var "create_k8s_secret=true" -var "k8s_namespace=pulse-connect" -var "k8s_secret_name=edge-gateway-db"
#
# Optional (RDS Security Group managed here):
#   -var "create_db_sg=true" -var "vpc_id=vpc-xxxx" -var "allowed_cidr_blocks=[\"10.0.0.0/16\"]"
#   or allow from an existing SG: -var "allowed_source_sg_ids=[\"sg-abc\"]"
#
# Optional (K8s Ingress with TLS + external-dns)
#   -var "ingress_enabled=true" -var "edge_hostname=edge.example.com" -var "tls_enabled=true" \
#   -var "cert_manager_cluster_issuer=letsencrypt-prod" -var "ingress_class_name=nginx"
#
# NOTE: If you omit db_password, a strong random password will be generated automatically.
###############################################

terraform {
  required_version = ">= 1.4.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
  # For production, configure a remote backend (S3 + DynamoDB) using a backend.hcl file:
  #   terraform -chdir=infra/terraform/edge init -backend-config=backend.hcl
  # See infra/terraform/edge/backend.hcl (template) for required values.
}

###############################################
# Providers
###############################################
provider "aws" {
  region = var.region
}

# Kubernetes provider: uses local kubeconfig by default if not explicitly set
provider "kubernetes" {
  config_path            = var.kubeconfig_path
  config_context_cluster = var.kubeconfig_context
  host                   = var.kube_host
  cluster_ca_certificate = var.kube_cluster_ca
  token                  = var.kube_token
  insecure               = var.kube_insecure
}

###############################################
# Variables
###############################################
variable "project_name" {
  description = "Logical project name used for tagging and naming."
  type        = string
  default     = "pulse-edge"
}

variable "region" {
  description = "AWS region for RDS."
  type        = string
  default     = "us-east-1"
}

variable "subnet_ids" {
  description = "List of private subnet IDs for RDS subnet group."
  type        = list(string)
}

variable "vpc_security_group_ids" {
  description = "List of security group IDs to attach to RDS (used when create_db_sg=false)."
  type        = list(string)
  default     = []
}

variable "vpc_id" {
  description = "VPC ID (required if create_db_sg=true)."
  type        = string
  default     = null
}

variable "create_db_sg" {
  description = "Whether to create a dedicated Security Group for the DB."
  type        = bool
  default     = false
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to connect to Postgres (only used if create_db_sg=true)."
  type        = list(string)
  default     = []
}

variable "allowed_source_sg_ids" {
  description = "Security Group IDs allowed to connect to Postgres (only used if create_db_sg=true)."
  type        = list(string)
  default     = []
}

variable "db_name" {
  description = "Postgres database name."
  type        = string
  default     = "pulsco_edge"
}

variable "db_username" {
  description = "Master username for Postgres."
  type        = string
}

variable "db_password" {
  description = "Master password for Postgres. If null, a strong random password will be generated."
  type        = string
  default     = null
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max autoscaled storage in GB (set >= allocated to enable autoscaling)."
  type        = number
  default     = 100
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "15.4"
}

variable "deletion_protection" {
  description = "Enable deletion protection for RDS."
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain RDS backups."
  type        = number
  default     = 7
}

variable "preferred_backup_window" {
  description = "Daily time range for automated backups (UTC)."
  type        = string
  default     = "03:00-04:00"
}

variable "preferred_maintenance_window" {
  description = "Weekly time range for maintenance (UTC)."
  type        = string
  default     = "Sun:05:00-Sun:06:00"
}

variable "multi_az" {
  description = "Enable Multi-AZ for RDS."
  type        = bool
  default     = false
}

variable "kms_key_id" {
  description = "Optional KMS key ID/ARN for RDS storage encryption. If not set, AWS default KMS key is used."
  type        = string
  default     = null
}

variable "performance_insights" {
  description = "Enable Performance Insights."
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds (0 disables)."
  type        = number
  default     = 0
}

# Optional: Create a Kubernetes Secret with DATABASE_URL
variable "create_k8s_secret" {
  description = "Whether to create a Kubernetes Secret with DATABASE_URL."
  type        = bool
  default     = false
}

variable "k8s_namespace" {
  description = "Kubernetes namespace where the secret/ingress will be created."
  type        = string
  default     = "pulse-connect"
}

variable "k8s_secret_name" {
  description = "Kubernetes Secret name to create/update."
  type        = string
  default     = "edge-gateway-db"
}

# Kubernetes provider optional inputs (leave empty to use default kubeconfig)
variable "kubeconfig_path" {
  type    = string
  default = null
}
variable "kubeconfig_context" {
  type    = string
  default = null
}
variable "kube_host" {
  type    = string
  default = null
}
variable "kube_cluster_ca" {
  type    = string
  default = null
}
variable "kube_token" {
  type    = string
  default = null
}
variable "kube_insecure" {
  type    = bool
  default = false
}

# Optional Ingress + TLS + external-dns
variable "ingress_enabled" {
  description = "Create a Kubernetes Ingress for the edge gateway service."
  type        = bool
  default     = false
}

variable "ingress_name" {
  description = "Name of the Ingress resource."
  type        = string
  default     = "edge-gateway"
}

variable "ingress_class_name" {
  description = "Ingress class (e.g., nginx, alb)."
  type        = string
  default     = null
}

variable "edge_service_name" {
  description = "Name of the edge gateway Service in Kubernetes."
  type        = string
  default     = "edge-gateway"
}

variable "edge_service_port" {
  description = "Service port exposed by the edge gateway Service."
  type        = number
  default     = 3000
}

variable "edge_hostname" {
  description = "DNS hostname for the Ingress (e.g., edge.example.com). Required if ingress_enabled=true."
  type        = string
  default     = ""
}

variable "tls_enabled" {
  description = "Enable TLS on the Ingress and request a certificate via cert-manager."
  type        = bool
  default     = true
}

variable "tls_secret_name" {
  description = "TLS secret name to store certs (managed by cert-manager)."
  type        = string
  default     = "edge-gateway-tls"
}

variable "cert_manager_cluster_issuer" {
  description = "cert-manager ClusterIssuer name (e.g., letsencrypt-prod)."
  type        = string
  default     = "letsencrypt-prod"
}

variable "external_dns_enabled" {
  description = "Annotate Ingress for external-dns to manage DNS automatically."
  type        = bool
  default     = true
}

variable "extra_ingress_annotations" {
  description = "Additional annotations to apply to the Ingress."
  type        = map(string)
  default     = {}
}

###############################################
# Password management
###############################################
resource "random_password" "db" {
  count   = var.db_password == null ? 1 : 0
  length  = 32
  special = true
  upper   = true
  lower   = true
  number  = true
  override_characters = "!@#%^*-_+=:.," # omit quotes/backslashes to avoid URL issues
}

locals {
  effective_password = var.db_password != null ? var.db_password : random_password.db[0].result
}

###############################################
# RDS: PostgreSQL
###############################################
resource "aws_db_subnet_group" "edge" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = var.subnet_ids
  tags = {
    Project = var.project_name
  }
}

# Optional random suffix to avoid name collisions in shared accounts
resource "random_id" "suffix" {
  byte_length = 2
}

resource "aws_db_parameter_group" "edge" {
  name   = "${var.project_name}-pg-${random_id.suffix.hex}"
  family = "postgres${split(var.db_engine_version, ".")[0]}" # e.g., 15.4 -> postgres15

  # Example tuned parameters (safe defaults); extend as needed
  parameter {
    name  = "log_min_duration_statement"
    value = "1000" # log queries slower than 1s
  }

  parameter {
    name  = "shared_buffers"
    value = "256MB"
  }

  tags = {
    Project = var.project_name
  }
}

# Optional Security Group managed here
resource "aws_security_group" "edge_db" {
  count       = var.create_db_sg ? 1 : 0
  name        = "${var.project_name}-db-${random_id.suffix.hex}"
  description = "Security Group for ${var.project_name} PostgreSQL"
  vpc_id      = var.vpc_id
  tags = {
    Project = var.project_name
  }
}

# Allow inbound from CIDR blocks
resource "aws_security_group_rule" "db_in_cidr" {
  count             = var.create_db_sg ? length(var.allowed_cidr_blocks) : 0
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [element(var.allowed_cidr_blocks, count.index)]
  security_group_id = aws_security_group.edge_db[0].id
}

# Allow inbound from other Security Groups
resource "aws_security_group_rule" "db_in_sg" {
  count                    = var.create_db_sg ? length(var.allowed_source_sg_ids) : 0
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = element(var.allowed_source_sg_ids, count.index)
  security_group_id        = aws_security_group.edge_db[0].id
}

# Allow all egress
resource "aws_security_group_rule" "db_egress_all" {
  count             = var.create_db_sg ? 1 : 0
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.edge_db[0].id
}

locals {
  selected_sg_ids = var.create_db_sg ? [aws_security_group.edge_db[0].id] : var.vpc_security_group_ids
}

resource "aws_db_instance" "edge" {
  identifier                  = "${var.project_name}-pg-${random_id.suffix.hex}"
  engine                      = "postgres"
  engine_version              = var.db_engine_version
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = var.db_max_allocated_storage
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = var.kms_key_id

  db_name                     = var.db_name
  username                    = var.db_username
  password                    = local.effective_password

  db_subnet_group_name        = aws_db_subnet_group.edge.name
  vpc_security_group_ids      = local.selected_sg_ids
  parameter_group_name        = aws_db_parameter_group.edge.name

  publicly_accessible         = false
  deletion_protection         = var.deletion_protection
  backup_retention_period     = var.backup_retention_period
  preferred_backup_window     = var.preferred_backup_window
  maintenance_window          = var.preferred_maintenance_window
  auto_minor_version_upgrade  = true
  multi_az                    = var.multi_az

  performance_insights_enabled = var.performance_insights
  monitoring_interval          = var.monitoring_interval

  skip_final_snapshot         = false

  tags = {
    Project = var.project_name
  }
}

locals {
  database_url = format(
    "postgresql://%s:%s@%s:%s/%s",
    var.db_username,
    urlencode(local.effective_password),
    aws_db_instance.edge.address,
    aws_db_instance.edge.port,
    var.db_name
  )
}

###############################################
# Optional: Kubernetes Secret with DATABASE_URL
###############################################
resource "kubernetes_namespace" "edge" {
  count = var.create_k8s_secret || var.ingress_enabled ? 1 : 0
  metadata {
    name = var.k8s_namespace
  }
}

resource "kubernetes_secret" "edge_db" {
  count = var.create_k8s_secret ? 1 : 0
  metadata {
    name      = var.k8s_secret_name
    namespace = var.k8s_namespace
  }
  # Provider will base64-encode automatically; use string_data for convenience
  string_data = {
    DATABASE_URL = local.database_url
  }
  type = "Opaque"
  depends_on = [kubernetes_namespace.edge]
}

###############################################
# Optional: Kubernetes Ingress with TLS + external-dns
###############################################
locals {
  ingress_annotations = merge(
    var.external_dns_enabled && var.edge_hostname != "" ? {
      "external-dns.alpha.kubernetes.io/hostname" = var.edge_hostname
    } : {},
    var.tls_enabled && var.cert_manager_cluster_issuer != null ? {
      "cert-manager.io/cluster-issuer" = var.cert_manager_cluster_issuer
    } : {},
    var.ingress_class_name != null ? {
      "kubernetes.io/ingress.class" = var.ingress_class_name
    } : {},
    var.extra_ingress_annotations
  )
}

resource "kubernetes_ingress_v1" "edge" {
  count = var.ingress_enabled ? 1 : 0

  metadata {
    name      = var.ingress_name
    namespace = var.k8s_namespace
    annotations = local.ingress_annotations
  }

  spec {
    ingress_class_name = var.ingress_class_name

    dynamic "tls" {
      for_each = var.tls_enabled && var.edge_hostname != "" ? [1] : []
      content {
        secret_name = var.tls_secret_name
        hosts       = [var.edge_hostname]
      }
    }

    rule {
      host = var.edge_hostname
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = var.edge_service_name
              port {
                number = var.edge_service_port
              }
            }
          }
        }
      }
    }
  }

  depends_on = [kubernetes_namespace.edge]
}

###############################################
# Outputs
###############################################
output "database_url" {
  description = "Connection string for the Edge PostgreSQL instance."
  value       = local.database_url
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS writer endpoint hostname."
  value       = aws_db_instance.edge.address
}

output "rds_port" {
  description = "RDS port."
  value       = aws_db_instance.edge.port
}

output "db_name" {
  description = "RDS database name."
  value       = var.db_name
}

output "created_db_sg_id" {
  description = "ID of the created DB Security Group (if create_db_sg=true)."
  value       = var.create_db_sg ? aws_security_group.edge_db[0].id : null
}
