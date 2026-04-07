"use client";

import { useState } from "react";
import { SubsystemCard } from "./SubsystemCard";
import { SubsystemModal } from "./SubsystemModal";
import { useSubsystemRegistry } from "../../hooks/useSubsystemRegistry";

export function SubsystemLauncher() {
  const [selectedSubsystem, setSelectedSubsystem] = useState<string | null>(null);
  const { subsystems, loading, error } = useSubsystemRegistry();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-4 text-slate-300">Loading planetary subsystems...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">Failed to load subsystems</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">PULSCO Planetary Subsystem Launcher</h2>
        <p className="text-slate-300 max-w-2xl mx-auto">
          Access all 10 planetary subsystems through a unified interface. Each subsystem is
          independently deployed but accessible through this portal.
        </p>
      </div>

      {/* Subsystem Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subsystems.map((subsystem) => (
          <SubsystemCard
            key={subsystem.id}
            subsystem={subsystem}
            onLaunch={() => setSelectedSubsystem(subsystem.id)}
          />
        ))}
      </div>

      {/* Quick Access Panel */}
      <div className="bg-slate-800/50 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Quick Access</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <button className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium">
            🌍 Places & Venues
          </button>
          <button className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-white font-medium">
            📢 PAP Marketing
          </button>
          <button className="p-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-medium">
            🔗 Matchmaking
          </button>
          <button className="p-4 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors text-white font-medium">
            🛒 E-commerce
          </button>
          <button className="p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white font-medium">
            🤖 AI Programs
          </button>
        </div>
      </div>

      {/* Subsystem Modal */}
      {selectedSubsystem && (
        <SubsystemModal
          subsystemId={selectedSubsystem}
          onClose={() => setSelectedSubsystem(null)}
        />
      )}
    </div>
  );
}
