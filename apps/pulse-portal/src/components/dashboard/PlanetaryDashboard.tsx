'use client'

import { AccessPatternVisualizer } from '../access/AccessPatternVisualizer'
import { SystemIntegrationVisualizer } from '../integration/SystemIntegrationVisualizer'

export function PlanetaryDashboard() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-white">Planetary Dashboard</h2>
        <p className="text-slate-300">
          Safe offline mode: read-only visuals only (no billing, wallet, admin, auth, edge, or MARP interactions).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-5">
          <AccessPatternVisualizer user={null} />
        </div>
        <div className="bg-slate-900/30 border border-slate-700 rounded-xl p-5">
          <SystemIntegrationVisualizer />
        </div>
      </div>
    </div>
  )
}

export default PlanetaryDashboard

