import { Request, Response } from "express";
import { JobDelegationService } from "pulse-connect-core/src/delegation/JobDelegationService";

const service = new JobDelegationService();

export const assignJob = (req: Request, res: Response) => {
  const { jobId, contributorId } = req.body;
  service.assignJob(jobId, contributorId);
  res.status(200).json({ message: "Job assigned" });
};

export const submitJob = (req: Request, res: Response) => {
  const { jobId } = req.body;
  service.submitJob(jobId);
  res.status(200).json({ message: "Job submitted" });
};

export const approveJob = (req: Request, res: Response) => {
  const { jobId } = req.body;
  service.approveJob(jobId);
  res.status(200).json({ message: "Job approved" });
};
