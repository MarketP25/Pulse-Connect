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
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
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

provider "aws" {
  alias  = "secondary"
  region = var.secondary_region
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

variable "secondary_region" {
  description = "Secondary AWS region for Aurora Global Database read replica."
  type        = string
  default     = "us-west-2"
}

variable "subnet_ids" {
  description = "List of private subnet IDs for RDS subnet group."
  type        = list(string)
}

variable "secondary_subnet_ids" {
  description = "List of private subnet IDs in the secondary region."
  type        = list(string)
  default     = []
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

variable "secondary_vpc_id" {
  description = "VPC ID in the secondary region (required if create_db_sg=true)."
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

variable "enable_rds_proxy" {
  description = "Whether to use RDS Proxy for connection pooling (recommended for K8s scale)."
  type        = bool
  default     = false
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

variable "elp_domain_name" {
  description = "Domain name for the Emergency Landing Page (e.g., status.pulsco.global)."
  type        = string
  default     = "status.pulsco.global"
}

variable "elp_s3_bucket_name" {
  description = "Name for the S3 bucket hosting the Emergency Landing Page."
  type        = string
  default     = "pulsco-emergency-landing-page"
}

 variable "elp_acm_certificate_arn" {
  description = "The ARN of the ACM certificate for the Emergency Landing Page (must be in us-east-1)."
  type        = string
  default     = null
}

variable "route53_zone_id" {
  description = "The Route53 Hosted Zone ID where the status domain record will be created."
  type        = string
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
  default     = "pulsco"
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

resource "random_password" "origin_token" {
  length  = 32
  special = false
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

resource "aws_db_subnet_group" "secondary" {
  count      = length(var.secondary_subnet_ids) > 0 ? 1 : 0
  provider   = aws.secondary
  name       = "${var.project_name}-db-subnets-secondary"
  subnet_ids = var.secondary_subnet_ids
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

resource "aws_security_group" "secondary_db" {
  count       = var.create_db_sg && length(var.secondary_subnet_ids) > 0 ? 1 : 0
  provider    = aws.secondary
  name        = "${var.project_name}-db-secondary-${random_id.suffix.hex}"
  description = "Security Group for ${var.project_name} PostgreSQL Secondary"
  vpc_id      = var.secondary_vpc_id
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

resource "aws_security_group_rule" "secondary_db_in_cidr" {
  count             = var.create_db_sg && length(var.secondary_subnet_ids) > 0 ? length(var.allowed_cidr_blocks) : 0
  provider          = aws.secondary
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = [element(var.allowed_cidr_blocks, count.index)]
  security_group_id = aws_security_group.secondary_db[0].id
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

resource "aws_security_group_rule" "secondary_db_egress_all" {
  count             = var.create_db_sg && length(var.secondary_subnet_ids) > 0 ? 1 : 0
  provider          = aws.secondary
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  ipv6_cidr_blocks  = ["::/0"]
  security_group_id = aws_security_group.secondary_db[0].id
}

locals {
  selected_sg_ids = var.create_db_sg ? [aws_security_group.edge_db[0].id] : var.vpc_security_group_ids
  secondary_selected_sg_ids = var.create_db_sg && length(var.secondary_subnet_ids) > 0 ? [aws_security_group.secondary_db[0].id] : []
}

###############################################
# Emergency Landing Page (ELP) S3 Bucket
###############################################
resource "aws_s3_bucket" "elp_content" {
  bucket = var.elp_s3_bucket_name

  tags = {
    Project = var.project_name
    Service = "EmergencyLandingPage"
  }
}

resource "aws_s3_bucket_public_access_block" "elp_content" {
  bucket = aws_s3_bucket.elp_content.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "elp_content" {
  bucket = aws_s3_bucket.elp_content.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_acl" "elp_content" {
  depends_on = [
    aws_s3_bucket_ownership_controls.elp_content,
    aws_s3_bucket_public_access_block.elp_content,
  ]

  bucket = aws_s3_bucket.elp_content.id
  acl    = "private"
}

resource "aws_s3_bucket_policy" "elp_content" {
  bucket = aws_s3_bucket.elp_content.id
  policy = data.aws_iam_policy_document.elp_s3_policy.json
}

data "aws_iam_policy_document" "elp_s3_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.elp_content.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.elp_cdn.arn]
    }
  }
}

# Example ELP content (index.html)
resource "aws_s3_object" "elp_index" {
  bucket       = aws_s3_bucket.elp_content.id
  key          = "index.html"
  content_type = "text/html"
  # Loading from a file makes it easier to edit in an IDE during an incident
  source       = "${path.module}/static/elp_index.html"
  etag         = filemd5("${path.module}/static/elp_index.html")
}

resource "aws_cloudfront_distribution" "elp_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for Emergency Landing Page"
  default_root_object = "index.html"

  origin {
    domain_name = aws_s3_bucket.elp_content.bucket_regional_domain_name
    origin_id   = "S3-ELP-Bucket"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.elp_oai.cloudfront_access_identity_path
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-ELP-Bucket"
    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
    compress               = true

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.elp_acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = [var.elp_domain_name]

  tags = {
    Project = var.project_name
    Service = "EmergencyLandingPage"
  }
}

resource "aws_cloudfront_origin_access_identity" "elp_oai" {
  comment = "OAI for ELP S3 bucket"
}

resource "aws_route53_record" "elp_cname" {
  zone_id = var.route53_zone_id
  name    = var.elp_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.elp_cdn.domain_name
    zone_id                = aws_cloudfront_distribution.elp_cdn.hosted_zone_id
    evaluate_target_health = false
  }
}

# New CloudFront distribution for the main application
resource "aws_cloudfront_distribution" "app_cdn" {
  count = var.app_domain_name != null && var.app_origin_domain_name != null ? 1 : 0

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for Main Application"
  web_acl_id          = aws_wafv2_web_acl.gso_containment.arn # Associate the global WAF

  origin {
    domain_name = var.app_origin_domain_name
    origin_id   = "ALB-App-Origin"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-CloudFront-Verify-Token"
      value = random_password.origin_token.result
    }
  }

  default_cache_behavior {
    target_origin_id       = "ALB-App-Origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    compress               = true
    forwarded_values {
      query_string = true
      headers      = ["*"] # Forward all headers to the origin
      cookies {
        forward = "all"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.app_acm_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  aliases = [var.app_domain_name]

  tags = {
    Project = var.project_name
    Service = "MainApplication"
  }
}

resource "aws_route53_record" "app_cname" {
  count = var.app_domain_name != null && var.app_origin_domain_name != null ? 1 : 0

  zone_id = var.route53_zone_id
  name    = var.app_domain_name
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.app_cdn[0].domain_name
    zone_id                = aws_cloudfront_distribution.app_cdn[0].hosted_zone_id
    evaluate_target_health = false
  }
}

###############################################
# AWS WAF (Equivalent to "Cloud Armor" for AWS)
###############################################
resource "aws_wafv2_ip_set" "marp_authorized_ips" {
  name               = "${var.project_name}-marp-authorized-ips"
  description        = "IP ranges for MARP team VPNs and GSO Dashboards to bypass Emergency Freeze."
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = ["1.2.3.4/32", "5.6.7.8/32"] # Replace with actual MARP infrastructure IPs

  tags = {
    Project = var.project_name
    Service = "Governance"
  }
}

resource "aws_wafv2_web_acl" "gso_containment" {
  name        = "${var.project_name}-containment-policy"
  description = "Planetary containment policy for Emergency Protocol enforcement."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # Rule 0: MARP Authorized Access Bypass
  # Allows the MARP team to reach the gateway during a freeze for incident resolution.
  rule {
    name     = "MarpBypass"
    priority = 0

    action {
      allow {}
    }

    statement {
      ip_set_reference_statement {
        arn = aws_wafv2_ip_set.marp_authorized_ips.arn
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "MarpBypass"
      sampled_requests_enabled   = true
    }
  }

  # Rule to enforce Emergency Landing Page redirection during FREEZE.
  # This WAF is regional, so it would be associated with an ALB or API Gateway
  # that sits in front of the main application.
  # It redirects to the CloudFront distribution serving the ELP.
  rule {
    name     = "RedirectToEmergencyLandingPage"
    priority = 1

    action {
      block {
        custom_response {
          # Redirect to the ELP CloudFront distribution
          response_code = 302
          response_headers {
            name = "Location"
            value = "https://${aws_cloudfront_distribution.elp_cdn.domain_name}"
          }
        }
      }
    }

    statement {
      # In production, this would be triggered by a specific header or IP set
      # managed dynamically by GSO/CSI signals.
      byte_match_statement {
        field_to_match {
          single_header {
            name = "x-pulsco-governance-state"
          }
        }
        positional_constraint = "EXACTLY"
        search_string         = "EMERGENCY_FREEZE"
        text_transformation {
          priority = 0
          type     = "NONE"
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RedirectToEmergencyLandingPage"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: Origin Protection
  # Enforces that traffic MUST come through CloudFront by verifying the secret token.
  rule {
    name     = "EnforceCloudFrontOrigin"
    priority = 2

    action {
      block {}
    }

    statement {
      not_statement {
        byte_match_statement {
          field_to_match {
            single_header {
              name = "x-cloudfront-verify-token"
            }
          }
          positional_constraint = "EXACTLY"
          search_string         = random_password.origin_token.result
          text_transformation {
            priority = 0
            type     = "NONE"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "EnforceCloudFrontOrigin"
      sampled_requests_enabled   = true
    }
  }

  custom_response_body {
    key          = "emergency_landing_page"
    content      = "{\"error\": \"Service Unavailable\", \"message\": \"PULSCO is currently in an EMERGENCY FREEZE state. Please visit https://status.pulsco.global for updates.\"}"
    content_type = "APPLICATION_JSON"
  }
}

resource "aws_rds_global_cluster" "edge" {
  global_cluster_identifier = "${var.project_name}-global"
  engine                    = "aurora-postgresql"
  engine_version            = var.db_engine_version
  database_name             = var.db_name
  storage_encrypted         = true
}

resource "aws_rds_cluster" "edge" {
  cluster_identifier      = "${var.project_name}-cluster"
  global_cluster_identifier = aws_rds_global_cluster.edge.id
  engine                  = aws_rds_global_cluster.edge.engine
  engine_version          = aws_rds_global_cluster.edge.engine_version
  database_name           = var.db_name
  master_username         = var.db_username
  master_password         = local.effective_password
  db_subnet_group_name    = aws_db_subnet_group.edge.name
  vpc_security_group_ids  = local.selected_sg_ids
  storage_encrypted       = true
  kms_key_id              = var.kms_key_id

  backup_retention_period = var.backup_retention_period
  preferred_backup_window = var.preferred_backup_window
  skip_final_snapshot     = false
  deletion_protection     = var.deletion_protection
}

resource "aws_rds_cluster_instance" "edge" {
  count              = 2
  identifier         = "${var.project_name}-instance-${count.index}"
  cluster_identifier = aws_rds_cluster.edge.id
  # Aurora requires db.t3.medium or larger
  instance_class     = var.db_instance_class == "db.t3.micro" ? "db.t3.medium" : var.db_instance_class
  engine             = aws_rds_cluster.edge.engine
  engine_version     = aws_rds_cluster.edge.engine_version

  performance_insights_enabled = var.performance_insights
  monitoring_interval          = var.monitoring_interval
}

resource "aws_rds_cluster" "secondary" {
  count                   = length(var.secondary_subnet_ids) > 0 ? 1 : 0
  provider                = aws.secondary
  cluster_identifier      = "${var.project_name}-cluster-secondary"
  global_cluster_identifier = aws_rds_global_cluster.edge.id
  engine                  = aws_rds_global_cluster.edge.engine
  engine_version          = aws_rds_global_cluster.edge.engine_version
  db_subnet_group_name    = aws_db_subnet_group.secondary[0].name
  vpc_security_group_ids  = local.secondary_selected_sg_ids
  storage_encrypted       = true
  kms_key_id              = var.kms_key_id

  skip_final_snapshot     = true

  depends_on = [aws_rds_cluster_instance.edge]
}

resource "aws_rds_cluster_instance" "secondary" {
  count              = length(var.secondary_subnet_ids) > 0 ? 1 : 0
  provider           = aws.secondary
  identifier         = "${var.project_name}-instance-secondary-${count.index}"
  cluster_identifier = aws_rds_cluster.secondary[0].id
  instance_class     = var.db_instance_class == "db.t3.micro" ? "db.t3.medium" : var.db_instance_class
  engine             = aws_rds_cluster.secondary[0].engine
  engine_version     = aws_rds_cluster.secondary[0].engine_version

  performance_insights_enabled = var.performance_insights
}

locals {
  database_url = format(
    "postgresql://%s:%s@%s:%s/%s",
    var.db_username,
    urlencode(local.effective_password),
    aws_rds_cluster.edge.endpoint,
    aws_rds_cluster.edge.port,
    var.db_name
  )
  secondary_database_url = length(var.secondary_subnet_ids) > 0 ? format(
    "postgresql://%s:%s@%s:%s/%s",
    var.db_username,
    urlencode(local.effective_password),
    aws_rds_cluster.secondary[0].reader_endpoint,
    aws_rds_cluster.secondary[0].port,
    var.db_name
  ) : ""
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
    DATABASE_URL           = local.database_url
    SECONDARY_DATABASE_URL = local.secondary_database_url
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
# NetworkPolicy: Hardening Ingress
###############################################
resource "local_file" "edge_network_policy" {
  count = var.ingress_enabled && length(var.alb_subnet_cidr_blocks) > 0 ? 1 : 0
  content = templatefile("${path.module}/network-policy.yaml.tftpl", {
    namespace              = var.k8s_namespace
    ingress_name           = var.ingress_name
    edge_service_name      = var.edge_service_name
    edge_service_port      = var.edge_service_port
    alb_subnet_cidr_blocks = var.alb_subnet_cidr_blocks
  })
  filename = "${path.module}/network-policy.yaml"
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
  value       = aws_rds_cluster.edge.endpoint
}

output "rds_port" {
  description = "RDS port."
  value       = aws_rds_cluster.edge.port
}

output "rds_secondary_endpoint" {
  description = "RDS reader endpoint for the secondary region."
  value       = length(var.secondary_subnet_ids) > 0 ? aws_rds_cluster.secondary[0].reader_endpoint : null
}

output "db_name" {
  description = "RDS database name."
  value       = var.db_name
}

output "created_db_sg_id" {
  description = "ID of the created DB Security Group (if create_db_sg=true)."
  value       = var.create_db_sg ? aws_security_group.edge_db[0].id : null
}

output "waf_web_acl_arn" {
  description = "ARN of the global WAF Web ACL."
  value       = aws_wafv2_web_acl.gso_containment.arn
}

output "app_cloudfront_domain_name" {
  description = "Domain name of the main application CloudFront distribution."
  value       = var.app_domain_name != null && var.app_origin_domain_name != null ? aws_cloudfront_distribution.app_cdn[0].domain_name : null
}
