import React from "react";
import { FileText } from "lucide-react";

export const AuditWrapper: React.FC<{ children: React.ReactNode; logId?: string }> = ({
  children,
  logId
}) => {
  return (
    <div className="group relative">
      {children}
      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 bg-cosmic-slate border border-grid-silver text-[8px] text-tech-white/50 px-1 rounded">
          <FileText size={8} />
          {logId || "IMMUTABLE_LOG_PENDING"}
        </div>
      </div>
    </div>
  );
};
