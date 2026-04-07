"use client";

import { useState } from "react";
import { RegistrationTier, MembershipLevel } from "../../types/membership";

interface RegistrationFlowProps {
  onRegistrationComplete: (user: any) => void;
  onSkipRegistration: () => void;
}

export function RegistrationFlow({
  onRegistrationComplete,
  onSkipRegistration
}: RegistrationFlowProps) {
  const [currentStep, setCurrentStep] = useState<
    "welcome" | "tier-selection" | "registration" | "verification"
  >("welcome");
  const [selectedTier, setSelectedTier] = useState<RegistrationTier | null>(null);

  const membershipTiers: RegistrationTier[] = [
    {
      id: "public",
      name: "Public Explorer",
      description: "Free access to basic planetary features",
      features: [
        "Browse places and venues",
        "Basic localization services",
        "Public information access",
        "No registration required"
      ],
      requirements: [],
      accessLevel: "public",
      price: 0
    },
    {
      id: "verified",
      name: "Verified Citizen",
      description: "Full consumer access with verification",
      features: [
        "All Public Explorer features",
        "Personalized recommendations",
        "Cross-subsystem data sharing",
        "Priority customer support",
        "Advanced proximity features"
      ],
      requirements: ["Email verification", "Basic identity check"],
      accessLevel: "verified",
      price: 0
    },
    {
      id: "premium",
      name: "Premium Member",
      description: "Enhanced features and priority access",
      features: [
        "All Verified Citizen features",
        "Advanced matchmaking priority",
        "Premium communication features",
        "Analytics and insights",
        "API access for integrations"
      ],
      requirements: ["Email verification", "Identity verification", "Address confirmation"],
      accessLevel: "business",
      price: 9.99
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "Complete business solution",
      features: [
        "All Premium Member features",
        "Multi-user management",
        "Advanced analytics dashboard",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantees"
      ],
      requirements: ["Business verification", "Legal entity validation", "Contract agreement"],
      accessLevel: "business",
      price: 99
    }
  ];

  const handleTierSelection = (tier: RegistrationTier) => {
    setSelectedTier(tier);
    if (tier.id === "public") {
      onSkipRegistration();
    } else {
      setCurrentStep("registration");
    }
  };

  if (currentStep === "welcome") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-white mb-4">Welcome to Pulsco</h2>
          <p className="text-xl text-slate-300 mb-6">
            Choose how you want to experience the planetary nervous system
          </p>
          <p className="text-slate-400">
            From free public access to enterprise-grade solutions, Pulsco adapts to your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-3">Quick Access</h3>
            <p className="text-slate-300 mb-4">
              Explore Pulsco without registration. Access public features immediately.
            </p>
            <button
              onClick={onSkipRegistration}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              Explore as Guest
            </button>
          </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-xl font-semibold text-white mb-3">Full Experience</h3>
            <p className="text-slate-300 mb-4">
              Register for personalized access, enhanced features, and seamless integration.
            </p>
            <button
              onClick={() => setCurrentStep("tier-selection")}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
            >
              Choose Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "tier-selection") {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Choose Your Membership</h2>
          <p className="text-slate-300">
            Select the membership level that best fits your planetary journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {membershipTiers.map((tier) => (
            <div
              key={tier.id}
              className="bg-slate-800/50 p-6 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
              onClick={() => handleTierSelection(tier)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                  <p className="text-slate-300 text-sm">{tier.description}</p>
                </div>
                <div className="text-right">
                  {tier.price === 0 ? (
                    <span className="text-green-400 font-semibold">Free</span>
                  ) : (
                    <span className="text-white font-semibold">${tier.price}/mo</span>
                  )}
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {tier.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="text-slate-300 text-sm flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {tier.requirements.length > 0 && (
                <div className="text-xs text-slate-400">
                  Requires: {tier.requirements.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
