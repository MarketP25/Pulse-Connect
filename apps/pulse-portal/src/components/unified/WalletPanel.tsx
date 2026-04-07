import React from "react";

interface WalletProps {
  userId: string;
}

export const WalletPanel: React.FC<WalletProps> = ({ userId }) => {
  const [balance, setBalance] = React.useState({ available: 0, currency: "USD" });

  React.useEffect(() => {
    fetch(`/api/billing/wallet/${userId}`)
      .then((res) => res.json())
      .then((data) => setBalance(data));
  }, [userId]);

  return (
    <div className="p-3 xxs:p-4 md:p-6 bg-white/5 rounded-sm xxs:rounded-md md:rounded-xl border border-white/20 backdrop-blur-xl">
      <h3 className="text-sm xxs:text-base md:text-lg font-bold text-white mb-3 xxs:mb-4">
        Unified Wallet
      </h3>
      <div className="text-lg xxs:text-xl md:text-2xl font-black text-emerald-400">
        {balance.available.toLocaleString()} {balance.currency}
      </div>
      <div className="text-xs xxs:text-sm text-slate-400 mt-1 xxs:mt-2">
        Cross-subsystem balance
      </div>
      <button className="mt-3 xxs:mt-4 px-3 xxs:px-4 py-1.5 xxs:py-2 bg-emerald-500 text-white rounded-md xxs:rounded-lg hover:bg-emerald-600 text-xs xxs:text-sm font-medium min-h-8 xxs:min-h-9 transition-colors">
        Top Up
      </button>
    </div>
  );
};
