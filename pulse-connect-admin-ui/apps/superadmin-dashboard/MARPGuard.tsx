import React from "react";
import { Lock, ShieldCheck } from "lucide-react";
import clsx from "clsx";

interface MARPGuardProps {
  action: string;
  tier: 1 | 2 | 3 | 4;
  isAuthorized: boolean;
  children: React.ReactNode;
}

export const MARPGuard: React.FC<MARPGuardProps> = ({ action, tier, isAuthorized, children }) => {
  if (!isAuthorized) {
    return (
      <div className="p-4 border border-critical/50 rounded-lg bg-nebula-dark flex items-center gap-3 opacity-90 backdrop-blur-sm">
        <Lock className="text-critical" size={18} />
        <span className="text-caption text-tech-white font-medium uppercase tracking-wider">
          Governance Lock: Tier {tier} required for "{action}"
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "relative transition-all duration-300",
        tier === 4 && "p-2 border-l-4 border-founder-gold bg-founder-signature/5 rounded-r-md"
      )}
    >
      {tier === 4 && (
        <div className="absolute -top-3 left-0 flex items-center gap-1 bg-founder-gold text-founder-signature px-2 py-0.5 rounded-full text-[9px] font-black italic uppercase shadow-glow-cyan">
          <ShieldCheck size={10} />
          Founder Signature Required
        </div>
      )}
      {children}
    </div>
  );
};
