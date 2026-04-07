import { AdminRoleType } from "@pulsco/admin-shared-types";

/**
 * COO Dashboard Metric Scope Configuration
 *
 * Defines what metrics the COO role is allowed to access and observe.
 * COO focuses on operational efficiency, resource utilization, and performance monitoring.
 */

export interface MetricScope {
  role: AdminRoleType;
  allowedMetrics: string[];
  allowedSubsystems: string[];
  canViewCrossDomain: boolean;
  canExport: boolean;
  canFreeze: boolean;
  canTriggerAudit: boolean;
  escalationThresholds: Record<string, number>;
  jurisdictionScopes: string[];
}

export const COO_METRIC_SCOPE: MetricScope = {
  role: "coo",
  allowedMetrics: [
    // Operational Efficiency Metrics
    "cpu_utilization",
    "memory_usage",
    "disk_usage",
    "network_throughput",
    "active_connections",
    "response_time",
    "error_rate",
    "throughput_rate",

    // Resource Utilization
    "resource_allocation_efficiency",
    "cost_per_transaction",
    "infrastructure_costs",
    "scaling_efficiency",

    // Performance KPIs
    "system_availability",
    "service_level_agreement",
    "mean_time_between_failures",
    "mean_time_to_recovery",

    // Operational Health
    "queue_depth",
    "processing_backlog",
    "resource_contention",
    "bottleneck_identification"
  ],
  allowedSubsystems: [
    "operations",
    "infrastructure",
    "monitoring",
    "performance",
    "resource-management"
  ],
  canViewCrossDomain: false, // COO focuses on operations, not cross-domain
  canExport: true,
  canFreeze: false, // Only SuperAdmin can freeze
  canTriggerAudit: true,
  escalationThresholds: {
    cpu_utilization: 0.85,
    memory_usage: 0.9,
    error_rate: 0.05,
    response_time: 2000, // 2 seconds
    system_availability: 0.995
  },
  jurisdictionScopes: ["global-operations", "infrastructure-management", "performance-monitoring"]
};

/**
 * Validate if a metric is within COO scope
 */
export function isMetricInCOOScope(metricName: string): boolean {
  return COO_METRIC_SCOPE.allowedMetrics.includes(metricName);
}

/**
 * Get escalation threshold for a metric
 */
export function getEscalationThreshold(metricName: string): number | undefined {
  return COO_METRIC_SCOPE.escalationThresholds[metricName];
}

/**
 * Check if COO can access a subsystem
 */
export function canAccessSubsystem(subsystem: string): boolean {
  return COO_METRIC_SCOPE.allowedSubsystems.includes(subsystem);
}

/**
 * Get all allowed metrics for filtering
 */
export function getAllowedMetrics(): string[] {
  return [...COO_METRIC_SCOPE.allowedMetrics];
}
