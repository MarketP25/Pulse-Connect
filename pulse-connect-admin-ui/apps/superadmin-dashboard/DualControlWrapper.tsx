import React from "react";
import { Users, ShieldAlert } from "lucide-react";
import { useMARPGovernance } from "./useMARPGovernance";

interface DualControlProps {
  actionId: string;
  children: React.ReactNode;
}

export const DualControlWrapper: React.FC<DualControlProps> = ({ actionId, children }) => {
  const { isPending, approversCount, requiredCount, status, error } = useMARPGovernance(actionId);

  if (error) {
    return (
      <div className="p-4 border border-critical bg-critical/10 rounded flex items-center gap-2 text-critical text-caption">
        <ShieldAlert size={16} />
        GOVERNANCE COMMUNICATION ERROR: PORT 3009 UNREACHABLE
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="p-4 border border-dashed border-warning rounded bg-cosmic-slate/50 flex flex-col gap-2 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-warning text-caption font-bold uppercase tracking-tighter">
            <Users size={16} />
            Dual Control: Verification in Progress
          </div>
          <div className="text-[10px] text-warning/70 font-mono">{status.toUpperCase()}</div>
        </div>

        <div className="flex items-center gap-2 text-tech-white text-[11px] bg-nebula-dark px-2 py-1 rounded">
          <Users size={16} />
          DUAL CONTROL PENDING: {approversCount}/{requiredCount} SIGNATURES
        </div>
        <div className="opacity-40 pointer-events-none grayscale">{children}</div>
      </div>
    );
  }
  return <>{children}</>;
};
