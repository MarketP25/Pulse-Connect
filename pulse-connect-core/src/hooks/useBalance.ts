// src/hooks/useBalance.ts
import useSWR from "swr";

interface BalanceResponse {
  balance: number;
}

// Define a typed fetcher
const fetcher = (url: string): Promise<BalanceResponse> =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  });

export function useBalance() {
  const { data, error } = useSWR<BalanceResponse>("/api/wallet/balance", fetcher);

  return {
    balance: data?.balance ?? 0,
    loading: !error && data === undefined,
    error
  };
}
