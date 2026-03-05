"use client";

import { useState } from "react";
import { DashboardMatchmakingOperationsModule } from "@/types/dashboard";
import { SectionCard } from "./SectionCard";

type Props = {
  title: string;
  data?: DashboardMatchmakingOperationsModule;
  enabled: boolean;
  disabledReason?: string;
  loading: boolean;
  onRunAction: (
    action: "create_brief" | "submit_proposal" | "create_contract",
    payload: Record<string, unknown>,
  ) => Promise<void>;
};

export function MatchmakingOperationsPanel({ title, data, enabled, disabledReason, loading, onRunAction }: Props) {
  const [briefTitle, setBriefTitle] = useState("Need localized growth campaign");
  const [proposalBriefId, setProposalBriefId] = useState("");
  const [proposalAmount, setProposalAmount] = useState("450");
  const [contractProposalId, setContractProposalId] = useState("");

  return (
    <SectionCard title={title} subtitle="Briefs, proposals, contracts, and transaction readiness for matchmaking workflows.">
      {!enabled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{disabledReason || "Matchmaking operations are unavailable."}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Briefs</p>
            {(data?.briefs || []).map((brief) => (
              <article key={brief.id} className="rounded-lg border border-slate-200 p-2">
                <p className="font-semibold text-slate-900">{brief.title}</p>
                <p>{brief.status}</p>
              </article>
            ))}
            <input
              className="w-full rounded border border-slate-300 px-2 py-1"
              value={briefTitle}
              onChange={(event) => setBriefTitle(event.target.value)}
            />
            <button
              className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              onClick={() => onRunAction("create_brief", { title: briefTitle })}
              disabled={loading}
            >
              Create Brief
            </button>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Proposals</p>
            {(data?.proposals || []).map((proposal) => (
              <article key={proposal.id} className="rounded-lg border border-slate-200 p-2">
                <p>Brief: {proposal.briefId}</p>
                <p>${proposal.amountUsd}</p>
                <p>{proposal.status}</p>
              </article>
            ))}
            <input
              className="w-full rounded border border-slate-300 px-2 py-1"
              placeholder="Brief ID"
              value={proposalBriefId}
              onChange={(event) => setProposalBriefId(event.target.value)}
            />
            <input
              className="w-full rounded border border-slate-300 px-2 py-1"
              placeholder="Amount"
              value={proposalAmount}
              onChange={(event) => setProposalAmount(event.target.value)}
            />
            <button
              className="rounded bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
              onClick={() =>
                onRunAction("submit_proposal", {
                  briefId: proposalBriefId,
                  amountUsd: Number(proposalAmount || 0),
                })
              }
              disabled={loading}
            >
              Submit Proposal
            </button>
          </div>

          <div className="space-y-2 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Contracts</p>
            {(data?.contracts || []).map((contract) => (
              <article key={contract.id} className="rounded-lg border border-slate-200 p-2">
                <p>Proposal: {contract.proposalId}</p>
                <p>{contract.status}</p>
              </article>
            ))}
            <input
              className="w-full rounded border border-slate-300 px-2 py-1"
              placeholder="Proposal ID"
              value={contractProposalId}
              onChange={(event) => setContractProposalId(event.target.value)}
            />
            <button
              className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
              onClick={() => onRunAction("create_contract", { proposalId: contractProposalId })}
              disabled={loading}
            >
              Create Contract
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

