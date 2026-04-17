import { DashboardSnapshot } from "./types";

export class SEOControlCenterDashboard {
  private snapshots: DashboardSnapshot[] = [];

  push(snapshot: DashboardSnapshot): void {
    this.snapshots.push(snapshot);
  }

  latest(): DashboardSnapshot | null {
    if (this.snapshots.length === 0) {
      return null;
    }

    return this.snapshots[this.snapshots.length - 1];
  }

  history(limit = 20): DashboardSnapshot[] {
    if (limit <= 0) {
      return [];
    }

    return this.snapshots.slice(-limit);
  }
}
