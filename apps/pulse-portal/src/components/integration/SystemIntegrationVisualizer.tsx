"use client";

import { useState } from "react";

interface SystemIntegrationVisualizerProps {
  showDetails?: boolean;
}

export function SystemIntegrationVisualizer({
  showDetails = false
}: SystemIntegrationVisualizerProps) {
  const [activeComponent, setActiveComponent] = useState<string | null>(null);

  const systemComponents = {
    portal: {
      name: "PULSCO Portal",
      role: "User Interface & Access Control",
      color: "bg-blue-500",
      functions: [
        "User authentication & registration",
        "Subsystem launcher & navigation",
        "Cross-subsystem analytics",
        "Unified user experience"
      ]
    },
    edge: {
      name: "Edge Gateway",
      role: "Global Routing & Security",
      color: "bg-green-500",
      functions: [
        "Request routing & load balancing",
        "Subsystem adapter registry",
        "Security enforcement",
        "Performance monitoring"
      ]
    },
    marp: {
      name: "MARP Governance",
      role: "Policy & Compliance",
      color: "bg-purple-500",
      functions: [
        "Policy evaluation & enforcement",
        "Audit trail generation",
        "Consent management",
        "Compliance verification"
      ]
    },
    pulsco: {
      name: "PULSCO Subsystems",
      role: "Business Logic & Services",
      color: "bg-orange-500",
      functions: [
        "Domain-specific operations",
        "Data processing & storage",
        "AI/ML processing",
        "Business rule execution"
      ]
    }
  };

  const integrationFlows = [
    {
      title: "User Request Flow",
      steps: [
        { component: "portal", action: "User clicks subsystem card" },
        { component: "portal", action: "Portal requests access token from Edge" },
        { component: "edge", action: "Edge validates user permissions" },
        { component: "marp", action: "MARP evaluates policies & consent" },
        { component: "edge", action: "Edge generates subsystem-specific token" },
        { component: "portal", action: "Portal launches subsystem with token" },
        { component: "pulsco", action: "Subsystem processes request with governance" }
      ]
    },
    {
      title: "Policy Enforcement Flow",
      steps: [
        { component: "pulsco", action: "Subsystem receives request with token" },
        { component: "edge", action: "Edge validates token & context" },
        { component: "marp", action: "MARP checks policy compliance" },
        { component: "marp", action: "MARP generates audit events" },
        { component: "edge", action: "Edge routes to appropriate adapter" },
        { component: "pulsco", action: "Subsystem executes with governance" },
        { component: "portal", action: "Results displayed with compliance status" }
      ]
    },
    {
      title: "Cross-Subsystem Data Flow",
      steps: [
        { component: "portal", action: "User requests cross-subsystem analytics" },
        { component: "edge", action: "Edge aggregates data from multiple subsystems" },
        { component: "marp", action: "MARP validates data access permissions" },
        { component: "pulsco", action: "Subsystems provide consented data" },
        { component: "edge", action: "Edge correlates & anonymizes data" },
        { component: "portal", action: "Portal displays unified analytics" },
        { component: "marp", action: "Audit trail captures data usage" }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          PULSCO System Integration Architecture
        </h2>
        <p className="text-slate-300 max-w-4xl mx-auto">
          The Portal, Edge Gateway, MARP Governance, and PULSCO subsystems work together as an
          integrated planetary nervous system, each component playing a critical role in delivering
          secure, governed, and intelligent planetary services.
        </p>
      </div>

      {/* System Components Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(systemComponents).map(([key, component]) => (
          <div
            key={key}
            className={`${component.color} rounded-xl p-6 text-white cursor-pointer transition-all hover:scale-105`}
            onClick={() => setActiveComponent(activeComponent === key ? null : key)}
          >
            <h3 className="text-xl font-semibold mb-2">{component.name}</h3>
            <p className="text-sm opacity-90 mb-4">{component.role}</p>
            <ul className="space-y-1 text-sm">
              {component.functions.slice(0, 2).map((func, index) => (
                <li key={index} className="flex items-center">
                  <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                  {func}
                </li>
              ))}
            </ul>
            {activeComponent === key && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <ul className="space-y-1 text-sm">
                  {component.functions.slice(2).map((func, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                      {func}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Integration Flow Diagrams */}
      <div className="space-y-8">
        {integrationFlows.map((flow, flowIndex) => (
          <div key={flowIndex} className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">{flow.title}</h3>
            <div className="space-y-4">
              {flow.steps.map((step, stepIndex) => {
                const component = systemComponents[step.component as keyof typeof systemComponents];
                return (
                  <div key={stepIndex} className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${component.color} flex-shrink-0`}></div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{component.name}</div>
                      <div className="text-slate-300 text-sm">{step.action}</div>
                    </div>
                    {stepIndex < flow.steps.length - 1 && (
                      <div className="text-slate-500 text-xl">↓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Integration Benefits */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-6 text-center">
          Why This Integration Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-medium text-white mb-3">Security & Trust</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Zero-trust architecture with continuous validation</li>
              <li>• Policy enforcement at every interaction point</li>
              <li>• Complete audit trails across all components</li>
              <li>• Consent-based data sharing and processing</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white mb-3">Performance & Scale</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Global load balancing and edge computing</li>
              <li>• Intelligent routing based on user location</li>
              <li>• Real-time health monitoring and failover</li>
              <li>• Planetary-scale data synchronization</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white mb-3">User Experience</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• Single sign-on across all planetary services</li>
              <li>• Unified interface with contextual navigation</li>
              <li>• Real-time cross-subsystem insights</li>
              <li>• Progressive enhancement based on permissions</li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-medium text-white mb-3">Governance & Compliance</h4>
            <ul className="space-y-2 text-slate-300">
              <li>• MARP policy enforcement at scale</li>
              <li>• Automated compliance verification</li>
              <li>• Community governance integration</li>
              <li>• Transparent decision-making processes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Technical Integration Details */}
      {showDetails && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-6 text-center">
            Technical Integration Details
          </h3>
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Authentication Flow</h4>
              <pre className="bg-slate-900 p-4 rounded text-sm text-slate-300 overflow-x-auto">
                {`Portal → Edge Gateway (JWT Request)
Edge → MARP (Policy Validation)
MARP → Edge (Policy Decision)
Edge → Portal (Subsystem Tokens)
Portal → Subsystems (Authenticated Requests)`}
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Data Flow Architecture</h4>
              <pre className="bg-slate-900 p-4 rounded text-sm text-slate-300 overflow-x-auto">
                {`User Request → Portal
Portal → Edge Gateway (Load Balancing)
Edge → MARP (Policy Check)
MARP → Subsystem Adapters (Governed Access)
Adapters → PULSCO Subsystems (Business Logic)
Subsystems → Edge (Results + Audit)
Edge → Portal (Formatted Response)`}
              </pre>
            </div>
            <div>
              <h4 className="text-lg font-medium text-white mb-3">Event-Driven Communication</h4>
              <pre className="bg-slate-900 p-4 rounded text-sm text-slate-300 overflow-x-auto">
                {`Subsystem Events → Edge Event Bus
Edge → MARP (Policy Evaluation)
MARP → Portal (Real-time Updates)
Portal → User Interface (Live Notifications)
Audit → MARP Governance (Compliance Records)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
