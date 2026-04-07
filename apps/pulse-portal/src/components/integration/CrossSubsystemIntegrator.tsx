"use client";

import { SystemIntegrationVisualizer } from "./SystemIntegrationVisualizer";

export function CrossSubsystemIntegrator() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Cross-Subsystem Integration</h2>
        <p className="text-slate-300">
          Architectural visualization only. No mutations are performed in offline mode.
        </p>
      </div>
      <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-5">
        <SystemIntegrationVisualizer showDetails />
      </div>
    </div>
  );
}

export default CrossSubsystemIntegrator;
