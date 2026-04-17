import React from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import clsx from "clsx";

interface CSIFeedbackProps {
  signal: "suggestion" | "anomaly" | "optimization";
  confidence: number;
  message: string;
}

export const CSIFeedback: React.FC<CSIFeedbackProps> = ({ signal, confidence, message }) => {
  const isHighRisk = signal === "anomaly" && confidence > 0.8;

  return (
    <div
      className={clsx(
        "p-3 rounded border flex gap-3 items-start animate-pulse",
        isHighRisk
          ? "bg-emergency-freeze/20 border-critical"
          : "bg-cosmic-slate/40 border-pulse-cyan-accent/30"
      )}
    >
      {signal === "anomaly" ? (
        <AlertCircle className="text-critical" size={16} />
      ) : (
        <Sparkles className="text-pulse-cyan-accent" size={16} />
      )}
      <p className="text-caption text-tech-white leading-tight">{message}</p>
    </div>
  );
};
