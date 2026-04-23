import React, { useState, Suspense } from "react";
import { ZoneNavigation } from "./ZoneNavigation";
import { IXAWorkspace } from "./IXAWorkspace";
import { AIPanel } from "./AIPanel";
import { AdminContactPanel } from "./AdminContactPanel";
import { Navigation } from "./packages/ui-components";
import { Bell, User } from "lucide-react";

export type IXAZone = "discover" | "shop" | "grow" | "connect" | "me";

export const IXALayout: React.FC = () => {
  const [activeZone, setActiveZone] = useState<IXAZone>("me");

  return (
    <div className="min-h-screen bg-nebula-900 text-tech-white flex flex-col font-sans">
      {/* Global Top Bar */}
      <Navigation title="PULSCO GLOBAL LTD" sticky>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center bg-cosmic-slate/50 px-4 py-1.5 rounded-full border border-grid-silver/30">
            <span className="text-xs text-pulse-cyan-400 font-mono tracking-tighter">
              PLANETARY NODE: NBO-01
            </span>
          </div>
          <div className="flex gap-4">
            <button className="hover:text-pulse-cyan-500 transition-colors">
              <Bell size={20} />
            </button>
            <button className="hover:text-pulse-cyan-500 transition-colors">
              <User size={20} />
            </button>
          </div>
        </div>
      </Navigation>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Zone Navigation */}
        <ZoneNavigation activeZone={activeZone} onZoneChange={setActiveZone} />

        {/* Main Workspace Area */}
        <main className="flex-1 relative overflow-y-auto bg-gradient-to-b from-nebula-900 to-orbit-blue-primary/50">
          <Suspense fallback={<div className="p-lg animate-pulse">Synchronizing Zone...</div>}>
            <IXAWorkspace zone={activeZone} />
          </Suspense>
        </main>
      </div>

      {/* Floating Global Overlays */}
      <AIPanel onZoneRequest={setActiveZone} />
      <AdminContactPanel />
    </div>
  );
};
