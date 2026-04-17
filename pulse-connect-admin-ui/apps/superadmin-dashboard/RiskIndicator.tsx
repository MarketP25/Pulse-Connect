import React from "react";
import { Activity } from "lucide-react";
import clsx from "clsx";

interface RiskIndicatorProps {
  score: number; // 0.0 to 1.0
  label: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({ score, label }) => {
  const isHighRisk = score > 0.7;
  const width = `${score * 100}%`;

  return (
    <div className="flex flex-col gap-1 w-full max-w-[200px]">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-tech-white/60">
        <span>CSI Risk: {label}</span>
        <span className={clsx(isHighRisk ? "text-critical" : "text-pulse-cyan-accent")}>
          {Math.round(score * 100)}%
        </span>
      </div>
      <div className="h-1 w-full bg-cosmic-slate rounded-full overflow-hidden border border-grid-silver/30">
        <div
          className={clsx(
            "h-full transition-all duration-1000 ease-out",
            isHighRisk
              ? "bg-critical shadow-[0_0_8px_var(--color-critical)]"
              : "bg-pulse-cyan-accent"
          )}
          style={{ width }}
        />
      </div>
    </div>
  );
};
