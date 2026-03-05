import fs from "fs";
import path from "path";
import { promisify } from "util";
import { Policy, Offer, WalletRecord, LedgerEntry } from "./types";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export class JSONPersistence {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "data", "billing");
    ensureDir(this.baseDir);
  }

  private file(p: string) {
    return path.join(this.baseDir, p + ".json");
  }

  async savePolicies(policies: Policy[]) {
    await writeFile(this.file("policies"), JSON.stringify(policies, null, 2), "utf8");
  }

  async loadPolicies(): Promise<Policy[]> {
    try {
      const raw = await readFile(this.file("policies"), "utf8");
      return JSON.parse(raw) as Policy[];
    } catch (e) {
      return [];
    }
  }

  async saveOffers(offers: Offer[]) {
    await writeFile(this.file("offers"), JSON.stringify(offers, null, 2), "utf8");
  }

  async loadOffers(): Promise<Offer[]> {
    try {
      const raw = await readFile(this.file("offers"), "utf8");
      return JSON.parse(raw) as Offer[];
    } catch (e) {
      return [];
    }
  }

  async saveWallets(wallets: WalletRecord[]) {
    await writeFile(this.file("wallets"), JSON.stringify(wallets, null, 2), "utf8");
  }

  async loadWallets(): Promise<WalletRecord[]> {
    try {
      const raw = await readFile(this.file("wallets"), "utf8");
      return JSON.parse(raw) as WalletRecord[];
    } catch (e) {
      return [];
    }
  }

  async saveLedger(entries: LedgerEntry[]) {
    await writeFile(this.file("ledger"), JSON.stringify(entries, null, 2), "utf8");
  }

  async loadLedger(): Promise<LedgerEntry[]> {
    try {
      const raw = await readFile(this.file("ledger"), "utf8");
      return JSON.parse(raw) as LedgerEntry[];
    } catch (e) {
      return [];
    }
  }
}
