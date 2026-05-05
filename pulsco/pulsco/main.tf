###############################################
# Governance Redis Stack (ElastiCache)
#
# Purpose:
# - Provision a distributed Redis store for planetary governance state.
# - Enable global state propagation via Pub/Sub for EMERGENCY_PROTOCOL enforcement.
###############################################

variable "project_name" {
  type    = string
  default = "pulsco-governance"
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "node_type" {
  type    = string
  default = "cache.t3.medium"
}

variable "num_cache_clusters" {
  type    = number
  default = 2
}

resource "random_password" "redis_auth" {
  length  = 32
  special = false # Redis AUTH tokens must be alphanumeric
}

resource "aws_elasticache_subnet_group" "governance" {
  name       = "${var.project_name}-subnet-group"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "redis_governance" {
  name        = "${var.project_name}-redis-sg"
  description = "Security Group for Governance Redis"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"] # Restrict to internal VPC CIDR
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_elasticache_parameter_group" "governance" {
  name   = "${var.project_name}-params"
  family = "redis7"

  parameter {
    name  = "cluster-enabled"
    value = "no"
  }
}

resource "aws_elasticache_replication_group" "governance_state" {
  replication_group_id          = "${var.project_name}-state"
  replication_group_description = "Planetary Governance State Store"
  node_type                     = var.node_type
  num_cache_clusters            = var.num_cache_clusters
  port                          = 6379
  parameter_group_name          = aws_elasticache_parameter_group.governance.name
  subnet_group_name             = aws_elasticache_subnet_group.governance.name
  security_group_ids            = [aws_security_group.redis_governance.id]

  engine         = "redis"
  engine_version = "7.0"

  automatic_failover_enabled = true
  multi_az_enabled           = true

  at_rest_encryption_enabled  = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth.result

  apply_immediately = true

  tags = {
    Project = var.project_name
    Service = "Governance"
  }
}

###############################################
# Outputs
###############################################
output "redis_primary_endpoint" {
  value = aws_elasticache_replication_group.governance_state.primary_endpoint_address
}

output "redis_auth_token" {
  value     = random_password.redis_auth.result
  sensitive = true
}