import React, { useState } from "react";

interface DualControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionId: string;
  onApproved: (attestation: string, attestationPayload: string) => void;
}

/**
 * PC365 Dual-Control Approval Modal
 * Handles Level 3 (L3) challenges by requiring a secondary founder attestation.
 */
export const DualControlModal: React.FC<DualControlModalProps> = ({
  isOpen,
  onClose,
  decisionId,
  onApproved
}) => {
  const [approverId, setApproverId] = useState("");
  const [pc365Token, setPc365Token] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/governance/dual-control/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionId,
          approverId,
          pc365Token
        })
      });

      if (response.ok) {
        const { attestation, attestationPayload } = await response.json();
        onApproved(attestation);
        onClose();
      } else {
        alert("Approval failed: Invalid Founder credentials.");
      }
    } catch (error) {
      console.error("Dual-control submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Founder Dual-Control Challenge</h3>
        <p>
          Decision Reference: <code>{decisionId}</code>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Approver ID (Secondary Founder)</label>
            <input
              type="text"
              value={approverId}
              onChange={(e) => setApproverId(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>PC365 Hardware Token / Secret</label>
            <input
              type="password"
              value={pc365Token}
              onChange={(e) => setPc365Token(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              Confirm Approval
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
