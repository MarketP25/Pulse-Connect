import { NextRequest, NextResponse } from "next/server";
import { AdminRoleType } from "@pulsco/admin-shared-types";
import { createPC365Guard } from "@pulsco/shared-lib";

type GovernanceDecision = {
  id: string;
  level: "Level1" | "Level2" | "Level3";
  status: "approved" | "approved-with-notification" | "pending-founder-approval" | "rejected";
  requiresFounderApproval: boolean;
  rationale: string[];
  simulationReport?: SimulationReport;
};

type SimulationReport = {
  id: string;
  outcome: "improve" | "neutral" | "regress";
  deltas: { trustDelta: number; performanceDelta: number };
  notes: string[];
};

type GovernanceProposal = {
  id?: string;
  title: string;
  subsystem: string;
  description: string;
  estimatedRisk: number;
  strategic: boolean;
  guardrailsCompliant: boolean;
  riskAdjustment?: number;
  performanceAdjustment?: number;
  requestedBy?: string;
  requestedByRole?: string;
};

const ALLOWED_READ_ROLES: AdminRoleType[] = [
  "superadmin",
  "coo",
  "business-ops",
  "tech-security",
  "governance-registrar",
  "dpo"
];

const STRATEGIC_APPROVER_ROLES: AdminRoleType[] = ["superadmin"];

function getGatewayUrl() {
  return process.env.ADMIN_GATEWAY_URL || "http://localhost:3001";
}

function getAuthContext(
  req: NextRequest
): { role: AdminRoleType; founderApproved: boolean; actorId: string } | null {
  const role = req.headers.get("x-admin-role") as AdminRoleType | null;
  const attestation = req.headers.get("x-pc365-attestation");
  const founder = req.headers.get("x-founder");
  const device = req.headers.get("x-device");
  const actorId = req.headers.get("x-admin-id") || "admin-session";

  if (!role || !attestation || attestation.length < 12 || !founder || !device) {
    return null;
  }

  try {
    const guard = createPC365Guard();
    guard.validateDestructiveAction({
      authorization: req.headers.get("authorization") || undefined,
      "x-pc365": attestation,
      "x-founder": founder,
      "x-device": device
    });
  } catch (error) {
    console.error("PC365 attestation rejected", error);
    return null;
  }

  return {
    role,
    founderApproved: req.headers.get("x-founder-approved") === "true",
    actorId
  };
}

function hasReadAccess(role: AdminRoleType): boolean {
  return ALLOWED_READ_ROLES.includes(role);
}

async function fetchGatewayIntelligence(req: NextRequest, role: AdminRoleType, action: string) {
  const gatewayUrl = getGatewayUrl();
  const response = await fetch(
    `${gatewayUrl}/api/admin/intelligence?role=${role}&action=${action}`,
    {
      method: "GET",
      headers: {
        "x-admin-role": role,
        "x-pc365-attestation": req.headers.get("x-pc365-attestation") || "",
        "x-founder-approved": req.headers.get("x-founder-approved") || "false"
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Gateway intelligence request failed: ${response.status}`);
  }

  return response.json();
}

async function publishGatewayEvent(
  req: NextRequest,
  role: AdminRoleType,
  eventType: string,
  payload: Record<string, unknown>
) {
  const gatewayUrl = getGatewayUrl();
  const response = await fetch(`${gatewayUrl}/api/admin/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-role": role,
      "x-pc365-attestation": req.headers.get("x-pc365-attestation") || "",
      "x-founder-approved": req.headers.get("x-founder-approved") || "false"
    },
    body: JSON.stringify({
      eventType,
      payload,
      source: "pulse-connect-admin-ui",
      timestamp: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`Gateway event publish failed: ${response.status}`);
  }

  return response.json();
}

function buildProposalFromRequest(body: Record<string, unknown>): GovernanceProposal {
  const raw = (body.proposal as Record<string, unknown>) || body;
  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    title: String(raw.title || ""),
    subsystem: String(raw.subsystem || "unknown"),
    description: String(raw.description || ""),
    estimatedRisk: Number(raw.estimatedRisk ?? 0),
    strategic: Boolean(raw.strategic),
    guardrailsCompliant: Boolean(raw.guardrailsCompliant),
    riskAdjustment: Number(raw.riskAdjustment ?? 0),
    performanceAdjustment: Number(raw.performanceAdjustment ?? 0),
    requestedBy: typeof raw.requestedBy === "string" ? raw.requestedBy : undefined,
    requestedByRole: typeof raw.requestedByRole === "string" ? raw.requestedByRole : undefined
  };
}

function buildSimulationReport(seed: string, proposal: GovernanceProposal): SimulationReport {
  const trustDelta = Math.round(
    (proposal.performanceAdjustment || 0) - proposal.estimatedRisk / 12
  );
  const performanceDelta = Math.round(
    (proposal.performanceAdjustment || 0) - (proposal.riskAdjustment || 0) / 2
  );
  const combined = trustDelta + performanceDelta;
  const outcome = combined >= 4 ? "improve" : combined <= -3 ? "regress" : "neutral";

  return {
    id: seed,
    outcome,
    deltas: { trustDelta, performanceDelta },
    notes: [
      "Advisory simulation only; no autonomous subsystem control applied.",
      "Strategic change approvals remain Founder/Superadmin-gated via governance policy."
    ]
  };
}

function evaluateProposal(proposal: GovernanceProposal): GovernanceDecision {
  const decisionId = proposal.id || `gov-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const rationale: string[] = [];

  let level: GovernanceDecision["level"] = "Level1";
  let status: GovernanceDecision["status"] = "approved";
  let requiresFounderApproval = false;

  if (proposal.strategic || proposal.estimatedRisk >= 70) {
    level = "Level3";
    status = "pending-founder-approval";
    requiresFounderApproval = true;
    rationale.push("Strategic or high-risk change detected; Founder/Superadmin approval required.");
  } else if (!proposal.guardrailsCompliant || proposal.estimatedRisk >= 35) {
    level = "Level2";
    status = "approved-with-notification";
    rationale.push(
      "Outside strict Level1 guardrails; supervised rollout with notifications required."
    );
  } else {
    rationale.push(
      "Within configured guardrails and low risk; eligible for Level1 advisory auto-optimization."
    );
  }

  rationale.push(
    "CSI remains advisory through Admin Gateway and does not execute subsystem mutations."
  );

  const simulationReport = buildSimulationReport(decisionId, proposal);

  return {
    id: decisionId,
    level,
    status,
    requiresFounderApproval,
    rationale,
    simulationReport
  };
}

export async function GET(req: NextRequest) {
  const auth = getAuthContext(req);
  if (!auth) {
    return new NextResponse("Unauthorized - PC365 attestation required", { status: 401 });
  }

  if (!hasReadAccess(auth.role)) {
    return new NextResponse("Forbidden - role does not have CSI read access", { status: 403 });
  }

  try {
    const [metrics, intelligence] = await Promise.all([
      fetchGatewayIntelligence(req, auth.role, "metrics"),
      fetchGatewayIntelligence(req, auth.role, "intelligence")
    ]);

    return NextResponse.json({
      intelligenceSummary: {
        source: "admin-gateway",
        role: auth.role
      },
      recommendedActions:
        intelligence?.data?.recommendations || intelligence?.recommendations || [],
      performanceInsights: metrics?.data || metrics || {},
      generatedAt: Date.now()
    });
  } catch (error) {
    console.error("CSI admin gateway GET failed", error);
    return new NextResponse("Failed to fetch CSI summaries through Admin Gateway", { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const auth = getAuthContext(req);
  if (!auth) {
    return new NextResponse("Unauthorized - PC365 attestation required", { status: 401 });
  }

  if (!hasReadAccess(auth.role)) {
    return new NextResponse("Forbidden - role does not have CSI write access", { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action || "propose");

    if (action === "propose") {
      const proposal = buildProposalFromRequest(body);
      const decision = evaluateProposal(proposal);

      await publishGatewayEvent(req, auth.role, "csi.governance.proposal_evaluated", {
        proposal,
        decision,
        actorId: auth.actorId
      });

      return NextResponse.json({
        decision,
        message:
          "Proposal evaluated through Admin Gateway. CSI remains advisory and non-autonomous."
      });
    }

    if (action === "simulate") {
      const change = (body.change as Record<string, unknown>) || {};
      const proposal = buildProposalFromRequest(change);
      const seed = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const report = buildSimulationReport(seed, proposal);

      await publishGatewayEvent(req, auth.role, "csi.governance.simulation_requested", {
        change: proposal,
        report,
        actorId: auth.actorId
      });

      return NextResponse.json({
        report,
        message: "Simulation requested via Admin Gateway and persisted as advisory output."
      });
    }

    if (action === "approve-level3") {
      if (!STRATEGIC_APPROVER_ROLES.includes(auth.role)) {
        return new NextResponse("Forbidden - only superadmin can approve Level3 decisions", {
          status: 403
        });
      }
      if (!auth.founderApproved) {
        return new NextResponse("Forbidden - founder approval header required", { status: 403 });
      }

      const decisionId = String(body.decisionId || "");
      if (!decisionId) {
        return new NextResponse("decisionId is required", { status: 400 });
      }

      const decision: GovernanceDecision = {
        id: decisionId,
        level: "Level3",
        status: "approved",
        requiresFounderApproval: true,
        rationale: [
          "Level3 strategic decision approved by superadmin with founder approval attestation.",
          "Execution remains downstream and policy-gated."
        ]
      };

      await publishGatewayEvent(req, auth.role, "csi.governance.level3_approved", {
        decisionId,
        actorId: auth.actorId
      });

      return NextResponse.json({
        decision,
        message: "Level3 decision approval recorded through Admin Gateway."
      });
    }

    return new NextResponse(`Unsupported action: ${action}`, { status: 400 });
  } catch (error) {
    console.error("CSI admin route error", error);
    return new NextResponse("Failed to process CSI governance action", { status: 500 });
  }
}
