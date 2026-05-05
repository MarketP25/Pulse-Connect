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
exports.DualControlModal = void 0;
const react_1 = __importStar(require("react"));
/**
 * PC365 Dual-Control Approval Modal
 * Handles Level 3 (L3) challenges by requiring a secondary founder attestation.
 */
const DualControlModal = ({ isOpen, onClose, decisionId, onApproved }) => {
    const [approverId, setApproverId] = (0, react_1.useState)("");
    const [pc365Token, setPc365Token] = (0, react_1.useState)("");
    const [isSubmitting, setIsSubmitting] = (0, react_1.useState)(false);
    if (!isOpen)
        return null;
    const handleSubmit = async (e) => {
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
            }
            else {
                alert("Approval failed: Invalid Founder credentials.");
            }
        }
        catch (error) {
            console.error("Dual-control submission error:", error);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (<div className="modal-overlay">
      <div className="modal-content">
        <h3>Founder Dual-Control Challenge</h3>
        <p>
          Decision Reference: <code>{decisionId}</code>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Approver ID (Secondary Founder)</label>
            <input type="text" value={approverId} onChange={(e) => setApproverId(e.target.value)} required/>
          </div>
          <div className="form-group">
            <label>PC365 Hardware Token / Secret</label>
            <input type="password" value={pc365Token} onChange={(e) => setPc365Token(e.target.value)} required/>
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
    </div>);
};
exports.DualControlModal = DualControlModal;
