import React from "react";
import { Button } from "@pulsco/ui-components/Button";
import { MARPGuard } from "@/components/MARPGuard";
import { DualControlWrapper } from "@/components/DualControlWrapper";
import { CSIFeedback } from "@/components/CSIFeedback";

export default function EcosystemDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <section>
        <h2 className="text-h2 font-bold mb-2 tracking-tight">Ecosystem Surface</h2>
        <p className="text-tech-white/60">Planetary command surface for subsystem orchestration and governance.</p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CSIFeedback
          signal="suggestion"
          confidence={0.94}
          message="CSI Intelligence: Proximity nodes in Nairobi are showing high-load. Suggest shifting Edge Gateway weights to Mombasa relay."
        />
      </div>

      <section className="p-8 rounded-2xl border border-grid-silver bg-cosmic-slate/20 backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-h4 font-bold text-founder-gold italic uppercase">Article V: Emergency Protocols</h3>
        </div>

        {/* Enforced Tier 4 Governance Action */}
        <MARPGuard action="GLOBAL_SUBSYSTEM_FREEZE" tier={4} isAuthorized={true}>
          <DualControlWrapper actionId="sys-freeze-planetary-001">
            <div className="p-6 border border-founder-gold/20 bg-founder-signature/5 rounded-xl flex flex-col gap-4">
              <p className="text-caption text-tech-white/80">Initiating this protocol requires two-party Founder signatures. This will suspend all transaction and payout paths globally.</p>
              <Button variant="emergency" isFullWidth>
                Activate Global System Freeze
              </Button>
            </div>
          </DualControlWrapper>
        </MARPGuard>
      </section>
    </div>
  );
}
