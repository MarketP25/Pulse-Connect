"use client";

import { useMemo, useState } from "react";

type GovernanceDecision = {
  id: string;
  level: "Level1" | "Level2" | "Level3";
  status: "approved" | "approved-with-notification" | "pending-founder-approval" | "rejected";
  requiresFounderApproval: boolean;
  rationale: string[];
};

type SimulationReport = {
  id: string;
  outcome: "improve" | "neutral" | "regress";
  deltas: { trustDelta: number; performanceDelta: number };
  notes: string[];
};

export function CSIDecisionFlowPanel() {
  const [pc365Token, setPc365Token] = useState("");
  const [adminRole, setAdminRole] = useState("superadmin");
  const [adminId, setAdminId] = useState("admin-session");
  const [title, setTitle] = useState("");
  const [subsystem, setSubsystem] = useState("ecommerce");
  const [description, setDescription] = useState("");
  const [estimatedRisk, setEstimatedRisk] = useState(20);
  const [strategic, setStrategic] = useState(false);
  const [guardrailsCompliant, setGuardrailsCompliant] = useState(true);
  const [decision, setDecision] = useState<GovernanceDecision | null>(null);
  const [simulationReport, setSimulationReport] = useState<SimulationReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return (
      pc365Token.trim().length >= 12 && title.trim().length > 2 && description.trim().length > 4
    );
  }, [pc365Token, title, description]);

  async function callApi(payload: Record<string, any>, founderApproved = false) {
    const response = await fetch("/api/admin/csi", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-role": adminRole,
        "x-admin-id": adminId,
        "x-pc365-attestation": pc365Token,
        "x-founder-approved": founderApproved ? "true" : "false"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "CSI API request failed");
    }

    return response.json();
  }

  async function evaluateProposal() {
    setPending(true);
    setError("");

    try {
      const data = await callApi({
        action: "propose",
        proposal: {
          title,
          subsystem,
          description,
          requestedBy: adminId,
          requestedByRole: adminRole,
          estimatedRisk,
          guardrailsCompliant,
          strategic,
          riskAdjustment: strategic ? 8 : -4,
          performanceAdjustment: guardrailsCompliant ? 6 : -5
        }
      });

      setDecision(data.decision);
      setSimulationReport(data.decision?.simulationReport || null);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to evaluate proposal");
    } finally {
      setPending(false);
    }
  }

  async function runSimulation() {
    setPending(true);
    setError("");

    try {
      const data = await callApi({
        action: "simulate",
        change: {
          title,
          subsystem,
          description,
          expectedMetricDelta: { latencyMs: -100, throughput: 20 },
          riskAdjustment: strategic ? 4 : -2,
          performanceAdjustment: guardrailsCompliant ? 4 : -3
        }
      });

      setSimulationReport(data.report);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to run simulation");
    } finally {
      setPending(false);
    }
  }

  async function approveLevel3() {
    if (!decision) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const data = await callApi(
        {
          action: "approve-level3",
          decisionId: decision.id
        },
        true
      );

      setDecision(data.decision);
    } catch (apiError) {
      setError(apiError instanceof Error ? apiError.message : "Failed to approve Level3 decision");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="bg-white p-6 rounded-lg shadow-md mt-8">
      <h2 className="text-xl font-semibold mb-4">CSI Governance Decision Flow</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="text-sm text-gray-700">
          Admin Role
          <select
            className="mt-1 block w-full rounded-md border-gray-300"
            value={adminRole}
            onChange={(event) => setAdminRole(event.target.value)}
          >
            {[
              "superadmin",
              "coo",
              "business-ops",
              "tech-security",
              "governance-registrar",
              "dpo"
            ].map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700">
          Admin ID
          <input
            className="mt-1 block w-full rounded-md border-gray-300"
            value={adminId}
            onChange={(event) => setAdminId(event.target.value)}
          />
        </label>

        <label className="text-sm text-gray-700 md:col-span-2">
          PC365 Attestation Token
          <input
            className="mt-1 block w-full rounded-md border-gray-300 font-mono"
            value={pc365Token}
            onChange={(event) => setPc365Token(event.target.value)}
            placeholder="Required for authenticated governance actions"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <label className="text-sm text-gray-700">
          Proposal Title
          <input
            className="mt-1 block w-full rounded-md border-gray-300"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="text-sm text-gray-700">
          Subsystem
          <select
            className="mt-1 block w-full rounded-md border-gray-300"
            value={subsystem}
            onChange={(event) => setSubsystem(event.target.value)}
          >
            {[
              "ecommerce",
              "places",
              "matchmaking",
              "ai-programs",
              "localization",
              "marketing(pap_v1)",
              "communication",
              "billing",
              "proximity"
            ].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-700 md:col-span-2">
          Description
          <textarea
            className="mt-1 block w-full rounded-md border-gray-300"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </label>

        <label className="text-sm text-gray-700">
          Estimated Risk
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 block w-full rounded-md border-gray-300"
            value={estimatedRisk}
            onChange={(event) => setEstimatedRisk(Number(event.target.value))}
          />
        </label>

        <label className="text-sm text-gray-700 flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={strategic}
            onChange={(event) => setStrategic(event.target.checked)}
          />
          Strategic change
        </label>

        <label className="text-sm text-gray-700 flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            checked={guardrailsCompliant}
            onChange={(event) => setGuardrailsCompliant(event.target.checked)}
          />
          Within Level1 guardrails
        </label>
      </div>

      <div className="flex gap-3">
        <button
          disabled={!canSubmit || pending}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
          onClick={evaluateProposal}
        >
          Evaluate Proposal
        </button>

        <button
          disabled={!canSubmit || pending}
          className="bg-gray-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
          onClick={runSimulation}
        >
          Run Simulation
        </button>

        {decision?.level === "Level3" && decision.status === "pending-founder-approval" && (
          <button
            disabled={pending || adminRole !== "superadmin"}
            className="bg-red-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
            onClick={approveLevel3}
          >
            Founder/Superadmin Approve
          </button>
        )}
      </div>

      {error && <p className="text-red-700 mt-4">{error}</p>}

      {decision && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <h3 className="font-semibold">Governance Decision</h3>
          <p>Level: {decision.level}</p>
          <p>Status: {decision.status}</p>
          <p>Founder Approval Required: {decision.requiresFounderApproval ? "Yes" : "No"}</p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-700">
            {decision.rationale.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {simulationReport && (
        <div className="mt-4 p-4 border rounded-md bg-blue-50">
          <h3 className="font-semibold">Simulation Report</h3>
          <p>Outcome: {simulationReport.outcome}</p>
          <p>Trust Delta: {simulationReport.deltas.trustDelta}</p>
          <p>Performance Delta: {simulationReport.deltas.performanceDelta}</p>
        </div>
      )}
    </section>
  );
}

export default CSIDecisionFlowPanel;
