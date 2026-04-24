import { createHash, randomUUID } from "crypto";

export type MARPActionType =
  | "meta_update"
  | "heading_update"
  | "content_publish"
  | "schema_attach"
  | "internal_link_update"
  | "distribution_publish"
  | "rollback";

export interface MARPActionInput {
  action: MARPActionType;
  page: string;
  approved: boolean;
  actorId: string;
  versionTag?: string;
  previousState?: unknown;
  nextState?: unknown;
  reversible?: boolean;
  notes?: string;
}

export interface MARPActionRecord extends MARPActionInput {
  id: string;
  timestamp: string;
  version: string;
  reversible: boolean;
  hash: string;
}

export interface MARPDeploymentAudit {
  id: string;
  cycleId: string;
  approved: boolean;
  checkedActions: string[];
  violations: string[];
  approvedBy: string;
  timestamp: string;
}

export interface DeploymentGateInput {
  cycleId: string;
  approvedBy: string;
  checkedActions: string[];
  violations: string[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildVersion(page: string, nextVersion: number): string {
  return `v${nextVersion}.${Math.max(0, page.length % 10)}`;
}

export class MARPGovernanceLedger {
  private readonly actions = new Map<string, MARPActionRecord>();
  private readonly actionOrder: string[] = [];
  private readonly pageVersions = new Map<string, number>();
  private readonly audits = new Map<string, MARPDeploymentAudit>();

  logAction(input: MARPActionInput): MARPActionRecord {
    const nextVersion = (this.pageVersions.get(input.page) ?? 0) + 1;
    this.pageVersions.set(input.page, nextVersion);

    const timestamp = nowIso();
    const version = input.versionTag ?? buildVersion(input.page, nextVersion);
    const reversible = input.reversible ?? true;

    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          action: input.action,
          page: input.page,
          approved: input.approved,
          actorId: input.actorId,
          timestamp,
          version,
          previousState: input.previousState,
          nextState: input.nextState
        })
      )
      .digest("hex");

    const record: MARPActionRecord = {
      ...input,
      id: randomUUID(),
      timestamp,
      version,
      reversible,
      hash
    };

    this.actions.set(record.id, record);
    this.actionOrder.push(record.id);

    return record;
  }

  rollbackAction(actionId: string, actorId: string): MARPActionRecord {
    const current = this.actions.get(actionId);
    if (!current) {
      throw new Error(`Unknown action id: ${actionId}`);
    }

    if (!current.reversible) {
      throw new Error(`Action ${actionId} is not reversible`);
    }

    return this.logAction({
      action: "rollback",
      page: current.page,
      approved: true,
      actorId,
      previousState: current.nextState,
      nextState: current.previousState,
      notes: `Rollback for ${actionId}`
    });
  }

  listActions(page?: string): MARPActionRecord[] {
    const records = this.actionOrder
      .map((id) => this.actions.get(id))
      .filter((record): record is MARPActionRecord => Boolean(record));

    if (!page) {
      return records;
    }

    return records.filter((record) => record.page === page);
  }

  createDeploymentAudit(input: DeploymentGateInput): MARPDeploymentAudit {
    const audit: MARPDeploymentAudit = {
      id: randomUUID(),
      cycleId: input.cycleId,
      approved: input.violations.length === 0,
      checkedActions: [...input.checkedActions],
      violations: [...input.violations],
      approvedBy: input.approvedBy,
      timestamp: nowIso()
    };

    this.audits.set(audit.id, audit);
    return audit;
  }

  assertDeploymentApproved(auditId: string): MARPDeploymentAudit {
    const audit = this.audits.get(auditId);
    if (!audit) {
      throw new Error("Deployment blocked: audit record missing");
    }

    if (!audit.approved) {
      throw new Error(`Deployment blocked: unresolved violations (${audit.violations.join(", ")})`);
    }

    return audit;
  }

  getAudit(auditId: string): MARPDeploymentAudit | undefined {
    return this.audits.get(auditId);
  }
}
