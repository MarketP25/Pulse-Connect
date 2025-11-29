import { useState } from "react";
import { Fund } from "@/lib/models/Fund";

export function useFund() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fund(data: Fund) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/wallet/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.message || "Funding failed");
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  return { fund, loading, error };
}