import React, { useState } from "react";
import { EdgeClient } from "../edge-client";

export const ArbitrationRequest: React.FC<{ userId: string }> = ({ userId }) => {
  const [reason, setReason] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      // Coordination: Send a signed request to the Edge Gateway
      // The Tier 3 Arbitration Council will receive this via the CSI telemetry loop
      const result = await EdgeClient.execute({
        subsystem: "governance",
        action: "arbitration:request",
        userId,
        payload: {
          reason,
          evidenceReference: evidenceId,
          tier: 3, // Escalation to Arbitration Council
          submittedAt: new Date().toISOString()
        }
      });

      console.log("Arbitration filed. Audit Hash:", result.auditHash);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-bold mb-4">Request for Arbitration (Tier 3)</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Reason for Dispute</label>
          <textarea
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Evidence ID (Transaction/Asset Reference)
          </label>
          <input
            type="text"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={evidenceId}
            onChange={(e) => setEvidenceId(e.target.value)}
            required
          />
        </div>
        <button
          disabled={status === "submitting"}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
        >
          {status === "submitting" ? "Signing & Submitting..." : "Submit to Council"}
        </button>
      </form>
      {status === "success" && (
        <p className="mt-2 text-green-600">Request submitted successfully to the MARP Council.</p>
      )}
    </div>
  );
};
