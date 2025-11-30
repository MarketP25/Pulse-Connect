import { useState } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useFund } from "@/hooks/useFund";
import styles from "@/styles/fundAccount.module.css";

export default function FundPage() {
  const { balance, loading, error: balError } = useBalance();
  const { fund, loading: funding, error } = useFund();
  const [amount, setAmount] = useState(0);

  if (loading) return <p>Loading balance…</p>;
  if (balError) return <p>Error fetching balance.</p>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fund({ amount, currency: "USD" });
  };

  return (
    <div className={styles.container}>
      <h1>Fund Your Wallet</h1>
      <p>Current Balance: USD {balance.toFixed(2)}</p>
      <form onSubmit={handleSubmit}>
        <label className={styles.field}>
          Amount (USD):
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
        </label>
        <button type="submit" disabled={funding} className={styles.button}>
          {funding ? "Processing…" : "Fund Wallet"}
        </button>
        {error && <p className={styles.errorText}>{error}</p>}
      </form>
    </div>
  );
}
