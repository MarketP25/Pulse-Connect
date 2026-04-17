import { Injectable } from "@nestjs/common";

@Injectable()
export class RoutingEngine {
  /**
   * Score-based node selection for planetary routing.
   * Targets optimal node based on multi-cloud telemetry and CSI risk signals.
   */
  calculateOptimalNode(nodes: any[], context: any) {
    const scoredNodes = nodes.map((node) => {
      // 1. Normalized Latency (Inverse: lower ms is higher score)
      const latencyFactor = Math.max(0, 1 - node.latency_score / 500);

      // 2. Health Status Factor
      const healthMap: Record<string, number> = { healthy: 1.0, degraded: 0.5, critical: 0.1 };
      const healthFactor = healthMap[node.health_status] || 0;

      // 3. CSI Risk Score (Inverse: lower risk is higher score)
      const riskFactor = 1 - parseFloat(node.risk_score);

      // 4. Capacity Availability
      const capacityFactor = node.capacity_available / node.capacity_total;

      // 5. Emergency Penalty (Safety net for high-risk anomalies)
      const emergencyMultiplier = node.risk_score > 0.85 ? 0 : 1;

      // Weighted Score Calculation
      const score =
        (latencyFactor * 0.4 + healthFactor * 0.2 + riskFactor * 0.2 + capacityFactor * 0.2) *
        emergencyMultiplier;

      return {
        nodeId: node.node_id,
        score,
        vector: { latencyFactor, healthFactor, riskFactor, capacityFactor },
        region: node.region_code
      };
    });

    // Sort by score descending
    const sorted = scoredNodes.sort((a, b) => b.score - a.score);
    const best = sorted[0];

    return {
      nodeId: best.nodeId,
      score: best.score,
      vector: best.vector,
      region: best.region,
      mode: best.score < 0.4 ? "degraded" : "normal"
    };
  }
}
