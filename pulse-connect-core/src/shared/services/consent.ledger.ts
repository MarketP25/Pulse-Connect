export interface ConsentRecord {
  user_id: string;
  channel: "email" | "sms" | "social";
  purpose: string;
  scopes: string[];
  subscription_pap_id: string;
  status: "active" | "revoked" | "expired";
  timestamp: Date;
  expiry?: Date;
  source: string;
  region: string;
  snapshot?: ConsentSnapshot;
}

export interface ConsentSnapshot {
  id: string;
  consent_id: string;
  snapshot_data: ConsentRecord;
  created_at: Date;
}

export class ConsentLedger {
  private ledger: Map<string, ConsentRecord[]> = new Map();
  private snapshots: Map<string, ConsentSnapshot[]> = new Map();

  /**
   * Add a consent record to the ledger
   */
  addConsent(consent: ConsentRecord): void {
    const userConsents = this.ledger.get(consent.user_id) || [];
    userConsents.push(consent);
    this.ledger.set(consent.user_id, userConsents);
  }

  /**
   * Revoke consent for a specific channel and purpose
   */
  revokeConsent(user_id: string, channel: string, purpose: string): void {
    const userConsents = this.ledger.get(user_id) || [];
    const updated = userConsents.map((c) =>
      c.channel === channel && c.purpose === purpose ? { ...c, status: "revoked" as const } : c
    );
    this.ledger.set(user_id, updated);
  }

  /**
   * Get active consents for a user
   */
  getActiveConsents(user_id: string): ConsentRecord[] {
    const userConsents = this.ledger.get(user_id) || [];
    return userConsents.filter(
      (c) => c.status === "active" && (!c.expiry || c.expiry > new Date())
    );
  }

  /**
   * Create a snapshot of current consents for a user
   */
  createSnapshot(user_id: string): ConsentSnapshot {
    const activeConsents = this.getActiveConsents(user_id);
    const snapshot: ConsentSnapshot = {
      id: `snap_${Date.now()}`,
      consent_id: user_id,
      snapshot_data: activeConsents[0] || ({} as ConsentRecord), // Assuming one per user for simplicity
      created_at: new Date()
    };
    const userSnapshots = this.snapshots.get(user_id) || [];
    userSnapshots.push(snapshot);
    this.snapshots.set(user_id, userSnapshots);
    return snapshot;
  }

  /**
   * Get latest snapshot for a user
   */
  getLatestSnapshot(user_id: string): ConsentSnapshot | null {
    const userSnapshots = this.snapshots.get(user_id) || [];
    return userSnapshots.sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0] || null;
  }
}
