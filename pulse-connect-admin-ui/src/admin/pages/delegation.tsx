export type JobStatus = "pending" | "in_progress" | "submitted" | "approved";

export interface Job {
  id: string;
  title: string;
  brief: string;
  deadline: string;
  payout: number;
  contributorId?: string;
  status: JobStatus;
  approvedAt?: string;
}

export interface LedgerEntry {
  jobId: string;
  contributorId: string;
  contributorShare: number;
  agencyFee: number;
  approvedAt: string;
}

export class JobDelegationService {
  private jobs: Job[] = [];
  private ledger: LedgerEntry[] = [];

  assignJob(jobId: string, contributorId: string) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.contributorId = contributorId;
      job.status = "in_progress";
    }
  }

  submitJob(jobId: string) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) job.status = "submitted";
  }

  approveJob(jobId: string) {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job && job.status === "submitted") {
      job.status = "approved";
      job.approvedAt = new Date().toISOString();
      const { contributorShare, agencyFee } = this.calculatePayout(jobId);
      this.ledger.push({
        jobId: job.id,
        contributorId: job.contributorId || "unknown",
        contributorShare,
        agencyFee,
        approvedAt: job.approvedAt
      });
    }
  }

  calculatePayout(jobId: string): { contributorShare: number; agencyFee: number } {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return { contributorShare: 0, agencyFee: 0 };
    const contributorShare = job.payout * 0.7;
    const agencyFee = job.payout * 0.3;
    return { contributorShare, agencyFee };
  }

  getFounderEarnings(): number {
    return this.ledger.reduce((sum, entry) => sum + entry.agencyFee, 0);
  }

  getLedger(): LedgerEntry[] {
    return this.ledger;
  }
}
