import React from "react";
import { GovernanceLevel } from "./index";
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
export declare const GovernanceButton: React.FC<GovernanceButtonProps>;
export {};
