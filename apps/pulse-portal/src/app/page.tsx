"use client";

import { useState } from "react";
import { useAdaptiveLayout } from "@pulsco/ui-components";
import { PlanetaryDashboard } from "../components/dashboard/PlanetaryDashboard";
import { SubsystemLauncher } from "../components/launcher/SubsystemLauncher";
import { CrossSubsystemIntegrator } from "../components/integration/CrossSubsystemIntegrator";
import { RealTimeMonitor } from "../components/monitoring/RealTimeMonitor";

export default function HomePage() {
  const [activeView, setActiveView] = useState<"dashboard" | "launcher" | "integrator" | "monitor">(
    "dashboard"
  );
  const { screenClass, prefersDark } = useAdaptiveLayout();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 text-xs text-slate-300">
        Adaptive class: {screenClass} • Theme: {prefersDark ? "dark" : "light/auto"}
      </div>
      {/* View Switcher */}
      <div className="mb-8 flex space-x-4">
        <button
          onClick={() => setActiveView("dashboard")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "dashboard"
              ? "bg-purple-600 text-white shadow-lg"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Planetary Dashboard
        </button>
        <button
          onClick={() => setActiveView("launcher")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "launcher"
              ? "bg-blue-600 text-white shadow-lg"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Subsystem Launcher
        </button>
        <button
          onClick={() => setActiveView("integrator")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "integrator"
              ? "bg-green-600 text-white shadow-lg"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Cross-Subsystem Integration
        </button>
        <button
          onClick={() => setActiveView("monitor")}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeView === "monitor"
              ? "bg-red-600 text-white shadow-lg"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          Real-Time Monitor
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        {activeView === "dashboard" && <PlanetaryDashboard />}
        {activeView === "launcher" && <SubsystemLauncher />}
        {activeView === "integrator" && <CrossSubsystemIntegrator />}
        {activeView === "monitor" && <RealTimeMonitor />}
      </div>
    </div>
  );
}
