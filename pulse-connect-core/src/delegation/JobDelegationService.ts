export type JobStatus = "pending" | "in_progress" | "submitted" | "approved";

export interface Job {
  id: string;
  title: string;
  brief: string;
  deadline: string;
  payout: number;
  contributorId?: string;
  status: JobStatus;
}

export class JobDelegationService {
  private jobs: Job[] = [];

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
    if (job) job.status = "approved";
  }

  calculatePayout(jobId: string): { contributorShare: number; agencyFee: number } {
    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return { contributorShare: 0, agencyFee: 0 };
    const contributorShare = job.payout * 0.7;
    const agencyFee = job.payout * 0.3;
    return { contributorShare, agencyFee };
  }
}
