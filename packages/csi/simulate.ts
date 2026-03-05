import { randomUUID } from "crypto";
import { CSIEvent } from "./events";
import { computeGlobalScores, computeSubsystemScores } from "./engine/scoring";
import { CSIIntelligenceVault, VaultAuthContext, VaultDocument } from "./vault";

export interface CSISimulationChange {
  id?: string;
  title: string;
  subsystem: string;
  description: string;
  expectedMetricDelta?: Record<string, number>;
  riskAdjustment?: number;
  performanceAdjustment?: number;
}

export interface CSISimulationReport {
  id: string;
  createdAt: number;
  proposal: CSISimulationChange;
  baseline: {
    globalTrustScore: number;
    globalPerformanceScore: number;
  };
  predicted: {
    globalTrustScore: number;
    globalPerformanceScore: number;
  };
  deltas: {
    trustDelta: number;
    performanceDelta: number;
  };
  outcome: "improve" | "neutral" | "regress";
  notes: string[];
}

function cloneEvent(event: CSIEvent): CSIEvent {
  return {
    ...event,
    metrics: { ...event.metrics },
  };
}

function applySimulationChange(event: CSIEvent, change: CSISimulationChange): CSIEvent {
  const updated = cloneEvent(event);

  if (updated.subsystem !== change.subsystem) {
    return updated;
  }

  if (change.riskAdjustment !== undefined) {
    const nextRisk = (updated.riskScore ?? 0) + change.riskAdjustment;
    updated.riskScore = Math.max(0, Math.min(100, Number(nextRisk.toFixed(2))));
  }

  if (change.performanceAdjustment !== undefined) {
    const nextPerformance = (updated.performanceScore ?? 60) + change.performanceAdjustment;
    updated.performanceScore = Math.max(0, Math.min(100, Number(nextPerformance.toFixed(2))));
  }

  if (change.expectedMetricDelta) {
    for (const [metricKey, delta] of Object.entries(change.expectedMetricDelta)) {
      const currentMetric = updated.metrics[metricKey];
      if (typeof currentMetric === "number" && Number.isFinite(currentMetric)) {
        updated.metrics[metricKey] = Number((currentMetric + delta).toFixed(4));
      }
    }
  }

  return updated;
}

export function simulateChangeAgainstHistory(
  change: CSISimulationChange,
  historicalEvents: CSIEvent[],
): CSISimulationReport {
  const baselineScores = computeGlobalScores(computeSubsystemScores(historicalEvents));
  const simulatedEvents = historicalEvents.map((event) => applySimulationChange(event, change));
  const predictedScores = computeGlobalScores(computeSubsystemScores(simulatedEvents));

  const trustDelta = Number((predictedScores.globalTrustScore - baselineScores.globalTrustScore).toFixed(2));
  const performanceDelta = Number(
    (predictedScores.globalPerformanceScore - baselineScores.globalPerformanceScore).toFixed(2),
  );

  let outcome: CSISimulationReport["outcome"] = "neutral";
  if (trustDelta + performanceDelta > 1) {
    outcome = "improve";
  } else if (trustDelta + performanceDelta < -1) {
    outcome = "regress";
  }

  const notes: string[] = [
    "Simulation was computed from historical CSI events; no subsystem was auto-controlled.",
    `Analyzed ${historicalEvents.length} historical events.`,
  ];

  if (outcome === "regress") {
    notes.push("Predicted regression detected. Require elevated governance review before rollout.");
  }

  return {
    id: change.id ?? randomUUID(),
    createdAt: Date.now(),
    proposal: change,
    baseline: {
      globalTrustScore: baselineScores.globalTrustScore,
      globalPerformanceScore: baselineScores.globalPerformanceScore,
    },
    predicted: {
      globalTrustScore: predictedScores.globalTrustScore,
      globalPerformanceScore: predictedScores.globalPerformanceScore,
    },
    deltas: {
      trustDelta,
      performanceDelta,
    },
    outcome,
    notes,
  };
}

export class CSISimulationEnvironment {
  private readonly vault?: CSIIntelligenceVault;

  constructor(vault?: CSIIntelligenceVault) {
    this.vault = vault;
  }

  run(change: CSISimulationChange, historicalEvents: CSIEvent[]): CSISimulationReport {
    return simulateChangeAgainstHistory(change, historicalEvents);
  }

  async runAndPersist(
    change: CSISimulationChange,
    historicalEvents: CSIEvent[],
    context: VaultAuthContext,
  ): Promise<{ report: CSISimulationReport; vaultRecord?: VaultDocument }> {
    const report = this.run(change, historicalEvents);

    if (!this.vault) {
      return { report };
    }

    const vaultRecord = await this.vault.storeAnalyticsResult(
      {
        type: "simulation_report",
        report,
      },
      context,
    );

    return { report, vaultRecord };
  }
}
