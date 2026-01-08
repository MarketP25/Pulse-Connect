export interface DashboardMetric {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export class ObservabilityDashboards {
  private metrics: DashboardMetric[] = [];

  /**
   * Record a metric
   */
  recordMetric(metric: Omit<DashboardMetric, "timestamp">): void {
    const fullMetric: DashboardMetric = {
      ...metric,
      timestamp: new Date()
    };
    this.metrics.push(fullMetric);
  }

  /**
   * Get deliverability metrics
   */
  getDeliverabilityMetrics(): { sent: number; delivered: number; bounced: number; rate: number } {
    const sent = this.metrics
      .filter((m) => m.name === "emails_sent")
      .reduce((sum, m) => sum + m.value, 0);
    const delivered = this.metrics
      .filter((m) => m.name === "emails_delivered")
      .reduce((sum, m) => sum + m.value, 0);
    const bounced = this.metrics
      .filter((m) => m.name === "emails_bounced")
      .reduce((sum, m) => sum + m.value, 0);
    const rate = sent > 0 ? (delivered / sent) * 100 : 0;
    return { sent, delivered, bounced, rate };
  }

  /**
   * Get send volume metrics
   */
  getSendVolumeMetrics(): { daily: number; weekly: number; monthly: number } {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const daily = this.metrics
      .filter((m) => m.name === "emails_sent" && m.timestamp >= dayAgo)
      .reduce((sum, m) => sum + m.value, 0);
    const weekly = this.metrics
      .filter((m) => m.name === "emails_sent" && m.timestamp >= weekAgo)
      .reduce((sum, m) => sum + m.value, 0);
    const monthly = this.metrics
      .filter((m) => m.name === "emails_sent" && m.timestamp >= monthAgo)
      .reduce((sum, m) => sum + m.value, 0);

    return { daily, weekly, monthly };
  }

  /**
   * Get throttle metrics
   */
  getThrottleMetrics(): { throttled: number; rate: number } {
    const throttled = this.metrics
      .filter((m) => m.name === "throttled_requests")
      .reduce((sum, m) => sum + m.value, 0);
    const total = this.metrics
      .filter((m) => m.name === "total_requests")
      .reduce((sum, m) => sum + m.value, 0);
    const rate = total > 0 ? (throttled / total) * 100 : 0;
    return { throttled, rate };
  }

  /**
   * Get CPA/CPL metrics
   */
  getCPACPLMetrics(): { cpa: number; cpl: number } {
    const acquisitions = this.metrics
      .filter((m) => m.name === "customer_acquisitions")
      .reduce((sum, m) => sum + m.value, 0);
    const leads = this.metrics
      .filter((m) => m.name === "leads_generated")
      .reduce((sum, m) => sum + m.value, 0);
    const spend = this.metrics
      .filter((m) => m.name === "marketing_spend")
      .reduce((sum, m) => sum + m.value, 0);

    const cpa = acquisitions > 0 ? spend / acquisitions : 0;
    const cpl = leads > 0 ? spend / leads : 0;

    return { cpa, cpl };
  }

  /**
   * Get spend pacing metrics
   */
  getSpendPacingMetrics(): { current: number; target: number; pacing: number } {
    const current = this.metrics
      .filter((m) => m.name === "current_spend")
      .reduce((sum, m) => sum + m.value, 0);
    const target = this.metrics
      .filter((m) => m.name === "target_spend")
      .reduce((sum, m) => sum + m.value, 0);
    const pacing = target > 0 ? (current / target) * 100 : 0;
    return { current, target, pacing };
  }

  /**
   * Get fairness index (simplified)
   */
  getFairnessIndex(): number {
    // Simplified fairness calculation - in reality would be more complex
    const positive = this.metrics
      .filter((m) => m.name === "positive_outcomes")
      .reduce((sum, m) => sum + m.value, 0);
    const total = this.metrics
      .filter((m) => m.name === "total_outcomes")
      .reduce((sum, m) => sum + m.value, 0);
    return total > 0 ? (positive / total) * 100 : 0;
  }
}
