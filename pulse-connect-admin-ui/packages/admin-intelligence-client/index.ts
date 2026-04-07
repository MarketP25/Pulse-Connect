// Admin Intelligence Client
// Shared service for all dashboards to access intelligence through API routes
// This ensures no direct CSI access from UI layer

export interface IntelligenceMetrics {
  [key: string]: number;
}

export interface IntelligenceAnomaly {
  metric: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  confidence: number;
  timestamp: Date;
}

export interface IntelligenceItem {
  type: "anomaly" | "trend" | "correlation" | "prediction";
  data: Record<string, unknown>;
  confidence: number;
  timestamp: Date;
}

export interface IntelligenceResponse {
  metrics?: IntelligenceMetrics;
  confidence?: Record<string, number>;
  freshness?: Record<string, number>;
  anomalies?: IntelligenceAnomaly[];
  intelligence?: IntelligenceItem[];
  timestamp?: string;
}

export class AdminIntelligenceClient {
  private baseUrl: string;
  private role: string;

  constructor(role: string, baseUrl: string = "/api/admin/intelligence") {
    this.role = role;
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch metrics for the dashboard's admin role
   */
  async fetchMetrics(
    metricKeys?: string[],
    timeRange?: { start: Date; end: Date }
  ): Promise<IntelligenceResponse> {
    const params = new URLSearchParams({
      action: "metrics",
      role: this.role
    });

    if (metricKeys && metricKeys.length > 0) {
      params.set("keys", metricKeys.join(","));
    }

    if (timeRange) {
      params.set("start", timeRange.start.toISOString());
      params.set("end", timeRange.end.toISOString());
    }

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": this.role
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metrics: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch anomalies for the dashboard's admin role
   */
  async fetchAnomalies(): Promise<IntelligenceAnomaly[]> {
    const response = await fetch(`${this.baseUrl}?action=anomalies&role=${this.role}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": this.role
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch anomalies: ${response.status}`);
    }

    const data = await response.json();
    return data.anomalies || [];
  }

  /**
   * Fetch intelligence stream for the dashboard's admin role
   */
  async fetchIntelligence(): Promise<IntelligenceItem[]> {
    const response = await fetch(`${this.baseUrl}?action=intelligence&role=${this.role}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": this.role
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch intelligence: ${response.status}`);
    }

    const data = await response.json();
    return data.intelligence || [];
  }

  /**
   * Submit an event (triggers event-driven CSI processing)
   */
  async submitEvent(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<IntelligenceResponse> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": this.role
      },
      body: JSON.stringify({
        eventType,
        payload,
        source: `${this.role}-dashboard`,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit event: ${response.status}`);
    }

    return response.json();
  }
}

export default AdminIntelligenceClient;
