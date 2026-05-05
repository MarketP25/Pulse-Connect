import React, { useState } from "react";
import { GovernanceLevel } from "./index";
import { DualControlModal } from "./DualControlModal";

interface GovernanceButtonProps {
  label: string;
  action: string;
  level: GovernanceLevel;
  onSuccess: () => void;
}

/**
 * A specialized button for high-governance actions.
 * Uses the 'founder' variant when LEVEL_3 is required.
 */
export const GovernanceButton: React.FC<GovernanceButtonProps> = ({
  label,
  action,
  level,
  onSuccess
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(null);

  const isFounderAction = level === GovernanceLevel.L3_FOUNDER_SIGNATURE;

  const handleAction = async (attestation?: string, attestationPayload?: string) => {
    const response = await fetch("/api/governed-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, level, attestation, attestationPayload })
    });

    if (response.status === 401) {
      // The middleware returned CHALLENGE_DUAL_CONTROL
      const data = await response.json();
      setActiveDecisionId(data.decisionId);
      setIsModalOpen(true);
    } else if (response.ok) {
      onSuccess();
    }
  };

  return (
    <>
      <button
        className={isFounderAction ? "btn-variant-founder" : "btn-variant-standard"}
        onClick={() => handleAction()}
      >
        {isFounderAction ? `👑 ${label} (Founder Only)` : label}
      </button>

      {activeDecisionId && (
        <DualControlModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          decisionId={activeDecisionId}
          onApproved={(attestation, attestationPayload) =>
            handleAction(attestation, attestationPayload)
          }
        />
      )}
    </>
  );
};
