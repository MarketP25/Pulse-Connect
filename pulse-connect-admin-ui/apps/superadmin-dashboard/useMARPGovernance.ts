import { useState, useEffect } from "react";

/**
 * useMARPGovernance
 * Custom hook to poll the MARP Governance API for real-time Dual Control status.
 * Defaults to polling Port 3009 as defined in the Pulsco dev orchestration scripts.
 *
 * @param actionId - The unique ID for the sensitive governance action.
 * @param interval - Polling frequency in milliseconds (default 3000ms).
 */
export interface GovernanceStatus {
  isPending: boolean;
  approversCount: number;
  requiredCount: number;
  status: "pending" | "approved" | "rejected";
}

export const useMARPGovernance = (actionId: string | null, interval = 3000) => {
  const [governanceState, setGovernanceState] = useState<GovernanceStatus>({
    isPending: true,
    approversCount: 0,
    requiredCount: 2,
    status: "pending"
  });
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!actionId) return;

    const pollGovernanceStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:3009/api/governance/dual-control/${actionId}`
        );

        if (!response.ok) {
          throw new Error(`Governance API error: ${response.statusText}`);
        }

        const data = await response.json();
        setGovernanceState(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      }
    };

    pollGovernanceStatus(); // Initial fetch
    const timer = setInterval(pollGovernanceStatus, interval);

    return () => clearInterval(timer);
  }, [actionId, interval]);

  return { ...governanceState, error };
};
