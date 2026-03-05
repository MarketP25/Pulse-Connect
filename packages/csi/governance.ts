import { randomUUID } from "crypto";
import { CSIEvent } from "./events";
import { CSISimulationChange, CSISimulationEnvironment, CSISimulationReport } from "./simulate";
import { CSIIntelligenceVault, VaultAuthContext } from "./vault";

export type GovernanceLevel = "Level1" | "Level2" | "Level3";
export type GovernanceStatus =
  | "approved"
  | "approved-with-notification"
  | "pending-founder-approval"
  | "rejected";

export interface GovernanceProposal extends CSISimulationChange {
  requestedBy: string;
  requestedByRole: string;
  estimatedRisk: number;
  guardrailsCompliant: boolean;
  strategic: boolean;
}

export interface GovernanceDecision {
  id: string;
  proposalId: string;
  level: GovernanceLevel;
  status: GovernanceStatus;
  requiresFounderApproval: boolean;
  notifications: string[];
  rationale: string[];
  advisoryOnly: true;
  simulationReport?: CSISimulationReport;
  approvedBy?: string;
  approvedAt?: number;
  createdAt: number;
}

export interface GovernanceEvaluationOptions {
  runSimulation?: boolean;
  historicalEvents?: CSIEvent[];
}

export function isStrategicApprovalRole(role: string): boolean {
  return role === "superadmin" || role === "founder";
}

export class CSIGovernanceEngine {
  private readonly vault: CSIIntelligenceVault;
  private readonly simulation: CSISimulationEnvironment;
  private readonly decisions = new Map<string, GovernanceDecision>();

  constructor(vault: CSIIntelligenceVault, simulation?: CSISimulationEnvironment) {
    this.vault = vault;
    this.simulation = simulation ?? new CSISimulationEnvironment(vault);
  }

  determineLevel(proposal: GovernanceProposal): GovernanceLevel {
    if (proposal.strategic || proposal.estimatedRisk >= 70) {
      return "Level3";
    }

    if (proposal.estimatedRisk >= 35 || !proposal.guardrailsCompliant) {
      return "Level2";
    }

    return "Level1";
  }

  async evaluateProposal(
    proposal: GovernanceProposal,
    context: VaultAuthContext,
    options: GovernanceEvaluationOptions = {},
  ): Promise<GovernanceDecision> {
    const level = this.determineLevel(proposal);
    const decisionId = randomUUID();
    const proposalId = proposal.id ?? randomUUID();
    const now = Date.now();

    let status: GovernanceStatus = "approved";
    const notifications: string[] = [];
    const rationale: string[] = [];

    if (level === "Level1") {
      status = "approved";
      rationale.push("Change is within preset guardrails and low risk.");
      rationale.push("Approved for auto-optimization execution path.");
    } else if (level === "Level2") {
      status = "approved-with-notification";
      notifications.push("Notify subsystem owners and governance registrar.");
      rationale.push("Moderate risk or guardrail exception requires supervised rollout.");
    } else {
      status = "pending-founder-approval";
      notifications.push("Founder/Superadmin approval required before execution.");
      rationale.push("Strategic impact or high risk classified as Level3.");
    }

    let simulationReport: CSISimulationReport | undefined;
    if (options.runSimulation && options.historicalEvents) {
      const { report } = await this.simulation.runAndPersist(proposal, options.historicalEvents, context);
      simulationReport = report;
      rationale.push(`Simulation outcome: ${report.outcome}`);
    }

    const decision: GovernanceDecision = {
      id: decisionId,
      proposalId,
      level,
      status,
      requiresFounderApproval: level === "Level3",
      notifications,
      rationale,
      advisoryOnly: true,
      simulationReport,
      createdAt: now,
    };

    this.decisions.set(decisionId, decision);
    await this.vault.storeHistoricalDecision(
      {
        type: "governance_decision",
        proposal,
        decision,
      },
      context,
    );

    return decision;
  }

  async approveStrategicDecision(
    decisionId: string,
    approver: { approverId: string; approverRole: string; founderApproval: boolean },
    context: VaultAuthContext,
  ): Promise<GovernanceDecision> {
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      throw new Error(`Unknown decision id: ${decisionId}`);
    }

    if (decision.level !== "Level3" || decision.status !== "pending-founder-approval") {
      throw new Error("Only pending Level3 decisions can be approved through this workflow");
    }

    if (!isStrategicApprovalRole(approver.approverRole) || !approver.founderApproval) {
      throw new Error("Founder or superadmin approval is required for strategic decisions");
    }

    const approvedDecision: GovernanceDecision = {
      ...decision,
      status: "approved",
      approvedBy: approver.approverId,
      approvedAt: Date.now(),
      rationale: [...decision.rationale, "Strategic approval granted by Founder/Superadmin."],
    };

    this.decisions.set(decisionId, approvedDecision);
    await this.vault.storeHistoricalDecision(
      {
        type: "governance_approval",
        decision: approvedDecision,
      },
      context,
    );

    return approvedDecision;
  }

  async runManualSimulation(
    change: CSISimulationChange,
    historicalEvents: CSIEvent[],
    context: VaultAuthContext,
  ): Promise<CSISimulationReport> {
    const { report } = await this.simulation.runAndPersist(change, historicalEvents, context);
    return report;
  }

  getDecision(decisionId: string): GovernanceDecision | undefined {
    return this.decisions.get(decisionId);
  }

  listDecisions(): GovernanceDecision[] {
    return [...this.decisions.values()].sort((left, right) => right.createdAt - left.createdAt);
  }
}
