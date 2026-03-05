import { WalletRecord } from "./types";

export class WalletService {
  private wallets = new Map<string, WalletRecord>();

  createWallet(walletId: string, accountId: string, initial = 0): WalletRecord {
    const r: WalletRecord = { walletId, accountId, currency: "USD", balance: initial, status: initial <= 0 ? "locked" : "active" };
    this.wallets.set(walletId, r);
    return r;
  }

  get(walletId: string) {
    return this.wallets.get(walletId) || null;
  }

  credit(walletId: string, amount: number) {
    const w = this.wallets.get(walletId);
    if (!w) throw new Error("wallet not found");
    w.balance += amount;
    if (w.balance > 0 && w.status === "locked") w.status = "active";
    return w;
  }

  debit(walletId: string, amount: number) {
    const w = this.wallets.get(walletId);
    if (!w) throw new Error("wallet not found");
    if (amount > w.balance) throw new Error("insufficient_funds");
    w.balance -= amount;
    if (w.balance <= 0) w.status = "locked";
    return w;
  }
}
