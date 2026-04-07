"use client";

import { useState, useEffect } from "react";
import { SubsystemInfo } from "../types/subsystem";

export function useSubsystemRegistry() {
  const [subsystems, setSubsystems] = useState<SubsystemInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubsystemRegistry();
  }, []);

  const fetchSubsystemRegistry = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would call your edge gateway API
      // For now, we'll simulate the subsystem data based on your codebase
      const mockSubsystems: SubsystemInfo[] = [
        {
          id: "places-venues",
          name: "Places & Venues",
          description: "Location intelligence and venue management",
          icon: "🌍",
          status: "online",
          health: 98,
          regionCount: 50,
          userCount: 2500000,
          features: ["Venue Discovery", "Reservations", "Reviews", "Location Intelligence"],
          endpoints: {
            ui: "http://localhost:3001",
            api: "http://localhost:4001/api",
            health: "http://localhost:4001/health"
          },
          dependencies: ["proximity-geocoding", "localization"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "pap-marketing",
          name: "PAP Marketing",
          description: "AI-driven proximity marketing platform",
          icon: "📢",
          status: "online",
          health: 96,
          regionCount: 45,
          userCount: 1800000,
          features: ["Consent Management", "Campaign Orchestration", "A/B Testing", "AI Agents"],
          endpoints: {
            ui: "http://localhost:3002",
            api: "http://localhost:4002/api",
            health: "http://localhost:4002/health"
          },
          dependencies: ["communication", "localization"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "matchmaking",
          name: "Matchmaking",
          description: "Professional gig economy platform",
          icon: "🔗",
          status: "online",
          health: 97,
          regionCount: 48,
          userCount: 3200000,
          features: [
            "Geospatial Search",
            "Contract Validation",
            "Reputation System",
            "Voice Notes"
          ],
          endpoints: {
            ui: "http://localhost:3003",
            api: "http://localhost:4003/api",
            health: "http://localhost:4003/health"
          },
          dependencies: ["proximity-geocoding", "communication", "payments"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "ecommerce",
          name: "E-commerce",
          description: "Planetary commerce with multi-currency payments",
          icon: "🛒",
          status: "online",
          health: 95,
          regionCount: 52,
          userCount: 4100000,
          features: ["Multi-currency", "Fraud Detection", "KYC Compliance", "Global Shipping"],
          endpoints: {
            ui: "http://localhost:3004",
            api: "http://localhost:4004/api",
            health: "http://localhost:4004/health"
          },
          dependencies: ["payments", "fraud", "localization"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "localization",
          name: "Localization Engine",
          description: "200+ languages with real-time translation",
          icon: "🌐",
          status: "online",
          health: 99,
          regionCount: 55,
          userCount: 5000000,
          features: [
            "Real-time Translation",
            "Sign Language",
            "Cultural Adaptation",
            "Geo-routing"
          ],
          endpoints: {
            ui: "http://localhost:3005",
            api: "http://localhost:4005/api",
            health: "http://localhost:4005/health"
          },
          dependencies: [],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "communication",
          name: "Communication",
          description: "Real-time encrypted messaging",
          icon: "💬",
          status: "online",
          health: 98,
          regionCount: 50,
          userCount: 3800000,
          features: ["End-to-end Encryption", "Real-time Messaging", "Voice Notes", "File Sharing"],
          endpoints: {
            ui: "http://localhost:3006",
            api: "http://localhost:4006/api",
            health: "http://localhost:4006/health"
          },
          dependencies: ["localization"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "pulse-intelligence",
          name: "Pulse Intelligence",
          description: "Global load balancing and AI decisioning",
          icon: "🧠",
          status: "online",
          health: 97,
          regionCount: 50,
          userCount: 6000000,
          features: ["Global Load Balancing", "AI Decisioning", "Policy Engine", "Event Bus"],
          endpoints: {
            ui: "http://localhost:3007",
            api: "http://localhost:4007/api",
            health: "http://localhost:4007/health"
          },
          dependencies: ["edge-gateway"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "edge-gateway",
          name: "Edge Gateway",
          description: "MARP governance and subsystem orchestration",
          icon: "🚪",
          status: "online",
          health: 99,
          regionCount: 50,
          userCount: 8000000,
          features: ["MARP Governance", "Adapter Registry", "Policy Enforcement", "Audit Chains"],
          endpoints: {
            ui: "http://localhost:3008",
            api: "http://localhost:4008/api",
            health: "http://localhost:4008/health"
          },
          dependencies: [],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "ai-programs",
          name: "AI Programs",
          description: "Super-intelligence grade AI agents and programs",
          icon: "🤖",
          status: "online",
          health: 98,
          regionCount: 50,
          userCount: 1500000,
          features: [
            "Pulse Agent Protocol",
            "AI Coordination",
            "Threat Analysis",
            "User Predictions"
          ],
          endpoints: {
            ui: "http://localhost:3010",
            api: "http://localhost:4010/api",
            health: "http://localhost:4010/health"
          },
          dependencies: ["pulse-intelligence", "communication"],
          lastUpdated: new Date().toISOString()
        },
        {
          id: "marp-governance",
          name: "MARP Governance",
          description: "Governance core and policy management",
          icon: "⚖️",
          status: "online",
          health: 100,
          regionCount: 50,
          userCount: 100000,
          features: ["Policy Management", "Council Voting", "Audit Compliance", "Override Rules"],
          endpoints: {
            ui: "http://localhost:3009",
            api: "http://localhost:4009/api",
            health: "http://localhost:4009/health"
          },
          dependencies: [],
          lastUpdated: new Date().toISOString()
        }
      ];

      setSubsystems(mockSubsystems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch subsystems");
    } finally {
      setLoading(false);
    }
  };

  const refreshSubsystem = async (subsystemId: string) => {
    // In a real implementation, this would refresh a specific subsystem's status
    await fetchSubsystemRegistry();
  };

  return {
    subsystems,
    loading,
    error,
    refreshSubsystem,
    refetch: fetchSubsystemRegistry
  };
}
