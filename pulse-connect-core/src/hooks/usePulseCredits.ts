// hooks/usePulseCredits.ts
import { useState, useEffect } from "react";
import axios from "axios";

export const usePulseCredits = (userId: string) => {
  const [balance, setBalance] = useState<number>(0);

  const fetchCredits = async () => {
    const res = await axios.get(`/api/credits/${userId}`);
    setBalance(res.data.balance);
  };

  const spendCredits = async (amount: number, reason: string) => {
    await axios.post(`/api/credits/spend`, { userId, amount, reason });
    fetchCredits();
  };

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  return { balance, spendCredits };
};
