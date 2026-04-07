// Resilience and Degraded Mode Handling for Pulsco Admin Governance System

export interface SystemHealth {
  component: string;
  status: "healthy" | "degraded" | "critical" | "offline";
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

export interface DegradedMode {
  id: string;
  name: string;
  description: string;
  triggerCondition: string;
  activeComponents: string[];
  disabledFeatures: string[];
  fallbackBehaviors: Record<string, any>;
  estimatedRecoveryTime: number;
  activatedAt?: Date;
}

export class ResilienceManager {
  private healthStatus: Map<string, SystemHealth> = new Map();
  private degradedModes: Map<string, DegradedMode> = new Map();
  private activeDegradedModes: Set<string> = new Set();

  constructor() {
    this.initializeDefaultDegradedModes();
  }

  getSystemHealth() {
    const components = Array.from(this.healthStatus.values());
    const activeDegradedModes = Array.from(this.activeDegradedModes);

    let overall = "healthy";
    if (components.some((c) => c.status === "offline")) overall = "offline";
    else if (components.some((c) => c.status === "critical")) overall = "critical";
    else if (components.some((c) => c.status === "degraded") || activeDegradedModes.length > 0)
      overall = "degraded";

    return { overall, components, activeDegradedModes, lastUpdated: new Date() };
  }

  async activateDegradedMode(modeId: string): Promise<boolean> {
    const mode = this.degradedModes.get(modeId);
    if (!mode) throw new Error(`Degraded mode ${modeId} not found`);

    if (this.activeDegradedModes.has(modeId)) return true;

    if (!(await this.evaluateTriggerCondition(mode.triggerCondition))) {
      throw new Error(`Trigger condition not met for degraded mode ${modeId}`);
    }

    mode.activatedAt = new Date();
    this.activeDegradedModes.add(modeId);

    console.log(`Activated degraded mode: ${mode.name}`);
    return true;
  }

  async deactivateDegradedMode(modeId: string): Promise<boolean> {
    const mode = this.degradedModes.get(modeId);
    if (!mode) return false;

    if (!this.activeDegradedModes.has(modeId)) return true;

    mode.deactivatedAt = new Date();
    this.activeDegradedModes.delete(modeId);

    console.log(`Deactivated degraded mode: ${mode.name}`);
    return true;
  }

  private async evaluateTriggerCondition(condition: string): Promise<boolean> {
    // Simple condition evaluation
    try {
      if (condition.includes("status")) {
        const [component, op, value] = condition.split(/\s+/);
        const cleanComponent = component.replace(".status", "");
        const health = this.healthStatus.get(cleanComponent);
        const status = health?.status || "unknown";

        if (op === "==") return status === value.replace(/"/g, "");
        if (op === "!=") return status !== value.replace(/"/g, "");
      }
      return false;
    } catch (error) {
      console.error("Error evaluating trigger condition:", condition, error);
      return false;
    }
  }

  private initializeDefaultDegradedModes(): void {
    const degradedModes: DegradedMode[] = [
      {
        id: "csi-degraded",
        name: "CSI Intelligence Degraded",
        description: "Reduced intelligence capabilities when CSI is unavailable",
        triggerCondition: 'csi.status != "healthy"',
        activeComponents: ["csi"],
        disabledFeatures: ["real-time-analytics", "anomaly-detection"],
        fallbackBehaviors: {
          metrics: "use-cached-data",
          alerts: "reduced-frequency",
          ui: "show-degraded-banner"
        },
        estimatedRecoveryTime: 30
      },
      {
        id: "marp-unavailable",
        name: "MARP Firewall Unavailable",
        description: "Last signed snapshot mode when MARP is unreachable",
        triggerCondition: 'marp.status == "offline"',
        activeComponents: ["marp"],
        disabledFeatures: ["policy-enforcement", "audit-logging"],
        fallbackBehaviors: {
          policies: "use-last-signed-snapshot",
          ui: "show-offline-banner"
        },
        estimatedRecoveryTime: 15
      },
      {
        id: "full-system-degraded",
        name: "Full System Degradation",
        description: "Minimal functionality mode for critical outages",
        triggerCondition: "critical_components_offline > 2",
        activeComponents: ["csi", "marp", "auth", "database"],
        disabledFeatures: ["real-time-updates", "export-functions", "advanced-filters"],
        fallbackBehaviors: {
          ui: "show-emergency-mode",
          data: "read-only-mode",
          alerts: "email-only"
        },
        estimatedRecoveryTime: 60
      }
    ];

    degradedModes.forEach((mode) => {
      this.degradedModes.set(mode.id, mode);
    });
  }
}

export default ResilienceManager;
