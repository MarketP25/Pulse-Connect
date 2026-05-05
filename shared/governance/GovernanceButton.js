"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceButton = void 0;
const react_1 = __importStar(require("react"));
const index_1 = require("./index");
const DualControlModal_1 = require("./DualControlModal");
/**
 * A specialized button for high-governance actions.
 * Uses the 'founder' variant when LEVEL_3 is required.
 */
const GovernanceButton = ({ label, action, level, onSuccess }) => {
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    const [activeDecisionId, setActiveDecisionId] = (0, react_1.useState)(null);
    const isFounderAction = level === index_1.GovernanceLevel.L3_FOUNDER_SIGNATURE;
    const handleAction = async (attestation, attestationPayload) => {
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
        }
        else if (response.ok) {
            onSuccess();
        }
    };
    return (<>
      <button className={isFounderAction ? "btn-variant-founder" : "btn-variant-standard"} onClick={() => handleAction()}>
        {isFounderAction ? `👑 ${label} (Founder Only)` : label}
      </button>

      {activeDecisionId && (<DualControlModal_1.DualControlModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} decisionId={activeDecisionId} onApproved={(attestation, attestationPayload) => handleAction(attestation, attestationPayload)}/>)}
    </>);
};
exports.GovernanceButton = GovernanceButton;
