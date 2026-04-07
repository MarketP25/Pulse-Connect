"use client";

import { UserProfile } from "../../types/auth";

interface AccessPatternVisualizerProps {
  user: UserProfile | null;
}

export function AccessPatternVisualizer({ user }: AccessPatternVisualizerProps) {
  const getUserAccessPattern = (user: UserProfile | null) => {
    if (!user) {
      return {
        pattern: "public",
        accessibleSubsystems: ["places-venues", "localization"],
        description: "Limited access to public features only"
      };
    }

    switch (user.role) {
      case "user":
        return {
          pattern: "consumer",
          accessibleSubsystems: [
            "places-venues",
            "communication",
            "localization",
            "matchmaking",
            "ecommerce"
          ],
          description: "Full consumer access to planetary services"
        };
      case "business":
        return {
          pattern: "enterprise",
          accessibleSubsystems: [
            "places-venues",
            "pap-marketing",
            "matchmaking",
            "ecommerce",
            "communication",
            "localization",
            "pulse-intelligence"
          ],
          description: "Business management and marketing tools"
        };
      case "admin":
        return {
          pattern: "administrator",
          accessibleSubsystems: ["*"], // All subsystems
          description: "Full system administration access"
        };
      case "council":
        return {
          pattern: "governance",
          accessibleSubsystems: [
            "marp-governance",
            "edge-gateway",
            "pulse-intelligence",
            "fraud",
            "communication"
          ],
          description: "Governance and oversight access"
        };
      default:
        return {
          pattern: "restricted",
          accessibleSubsystems: ["places-venues"],
          description: "Basic access pending verification"
        };
    }
  };

  const accessPattern = getUserAccessPattern(user);

  const accessFlows = {
    public: {
      title: "🌐 Public Access",
      description: "Anonymous users and basic consumers",
      flow: [
        "Visit pulsco.com",
        "Portal detects no authentication",
        "Shows public subsystems only",
        "Optional: Sign up for enhanced access"
      ],
      exampleUsers: ["Tourists", "Local residents", "Anonymous browsers"]
    },
    consumer: {
      title: "👤 Consumer Access",
      description: "Verified individual users",
      flow: [
        "Login to Portal",
        "MFA verification if enabled",
        "Access personal dashboard",
        "Launch authorized subsystems",
        "Cross-subsystem data sharing"
      ],
      exampleUsers: ["Verified users", "Premium subscribers", "Proximity service users"]
    },
    enterprise: {
      title: "🏢 Enterprise Access",
      description: "Business accounts and organizations",
      flow: [
        "Business login with org credentials",
        "Role-based subsystem access",
        "Team management features",
        "Analytics and reporting",
        "Bulk operations across subsystems"
      ],
      exampleUsers: ["Business owners", "Marketing agencies", "Venue managers"]
    },
    administrator: {
      title: "⚙️ Administrator Access",
      description: "System administrators",
      flow: [
        "Admin portal login",
        "Full subsystem access",
        "System health monitoring",
        "User management",
        "Configuration and maintenance"
      ],
      exampleUsers: ["System admins", "DevOps engineers", "Platform managers"]
    },
    governance: {
      title: "🏛️ Governance Access",
      description: "Council members and auditors",
      flow: [
        "Secure council login",
        "Policy review and approval",
        "Audit trail access",
        "Compliance monitoring",
        "Emergency override capabilities"
      ],
      exampleUsers: ["Council members", "Compliance officers", "Auditors"]
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Pulsco User Access Patterns</h2>
        <p className="text-slate-300 max-w-3xl mx-auto">
          Different user types access subsystems through tailored authentication and authorization
          flows, ensuring security while maintaining usability across your planetary platform.
        </p>
      </div>

      {/* Current User Access Pattern */}
      {user && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-xl font-semibold text-white mb-4">Your Access Pattern</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">👤</div>
              <div className="text-white font-medium capitalize">{user.role}</div>
              <div className="text-slate-400 text-sm">Role</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🔐</div>
              <div className="text-white font-medium">{accessPattern.pattern}</div>
              <div className="text-slate-400 text-sm">Pattern</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🌍</div>
              <div className="text-white font-medium">{user.region}</div>
              <div className="text-slate-400 text-sm">Region</div>
            </div>
          </div>
          <p className="text-slate-300 mt-4">{accessPattern.description}</p>
        </div>
      )}

      {/* Access Pattern Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(accessFlows).map(([pattern, config]) => (
          <div
            key={pattern}
            className={`rounded-xl p-6 border transition-all ${
              accessPattern.pattern === pattern
                ? "bg-purple-900/50 border-purple-500 shadow-lg"
                : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
            }`}
          >
            <h3 className="text-xl font-semibold text-white mb-3">{config.title}</h3>
            <p className="text-slate-300 mb-4">{config.description}</p>

            <div className="space-y-2 mb-4">
              <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Access Flow
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-slate-300">
                {config.flow.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                Example Users
              </h4>
              <div className="flex flex-wrap gap-2">
                {config.exampleUsers.map((userType, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-700 text-xs text-slate-300 rounded-full"
                  >
                    {userType}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Access Matrix */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-semibold text-white mb-4">Subsystem Access Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-2 px-4 text-slate-400 font-medium">Subsystem</th>
                <th className="text-center py-2 px-4 text-slate-400 font-medium">Public</th>
                <th className="text-center py-2 px-4 text-slate-400 font-medium">User</th>
                <th className="text-center py-2 px-4 text-slate-400 font-medium">Business</th>
                <th className="text-center py-2 px-4 text-slate-400 font-medium">Admin</th>
                <th className="text-center py-2 px-4 text-slate-400 font-medium">Council</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: "places-venues", name: "Places & Venues" },
                { id: "pap-marketing", name: "PAP Marketing" },
                { id: "matchmaking", name: "Matchmaking" },
                { id: "ecommerce", name: "E-commerce" },
                { id: "communication", name: "Communication" },
                { id: "localization", name: "Localization" },
                { id: "pulse-intelligence", name: "Pulse Intelligence" },
                { id: "edge-gateway", name: "Edge Gateway" },
                { id: "marp-governance", name: "MARP Governance" }
              ].map((subsystem) => (
                <tr key={subsystem.id} className="border-b border-slate-800">
                  <td className="py-3 px-4 text-white font-medium">{subsystem.name}</td>
                  <td className="py-3 px-4 text-center">
                    {["places-venues", "localization"].includes(subsystem.id) ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-slate-600">✗</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {[
                      "places-venues",
                      "communication",
                      "localization",
                      "matchmaking",
                      "ecommerce"
                    ].includes(subsystem.id) ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-slate-600">✗</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {[
                      "places-venues",
                      "pap-marketing",
                      "matchmaking",
                      "ecommerce",
                      "communication",
                      "localization",
                      "pulse-intelligence"
                    ].includes(subsystem.id) ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-slate-600">✗</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-green-400">✓</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {[
                      "marp-governance",
                      "edge-gateway",
                      "pulse-intelligence",
                      "communication"
                    ].includes(subsystem.id) ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-slate-600">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
