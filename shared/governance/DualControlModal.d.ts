import React from "react";
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
export declare const DualControlModal: React.FC<DualControlModalProps>;
export {};
