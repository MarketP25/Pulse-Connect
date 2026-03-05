import { LedgerEntry } from "./types";
import crypto from "crypto";

export class LedgerService {
  private entries: LedgerEntry[] = [];

  lastHashForWallet(walletId: string): string | null {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      if (this.entries[i].walletId === walletId) return this.entries[i].entryHash || null;
    }
    return null;
  }

  append(entry: Omit<LedgerEntry, "prevHash" | "entryHash" | "balanceAfter"> & { balanceAfter: number }): LedgerEntry {
    const prevHash = this.lastHashForWallet(entry.walletId);
    const base = { ...entry, prevHash } as LedgerEntry;
    const hashSource = JSON.stringify({ ...base, entryHash: undefined, prevHash });
    const entryHash = crypto.createHash("sha256").update(hashSource).digest("hex");
    base.entryHash = entryHash;
    this.entries.push(base);
    return base;
  }

  entriesForAccount(accountId: string) {
    return this.entries.filter((e) => e.accountId === accountId);
  }

  all() {
    return [...this.entries];
  }
}
