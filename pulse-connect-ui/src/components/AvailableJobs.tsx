import React from "react";
import { Job } from "pulse-connect-core/src/delegation/JobDelegationService";

const mockJobs: Job[] = [
  {
    id: "1",
    title: "Design Logo",
    brief: "Create a logo for a fintech app",
    deadline: "2025-10-01",
    payout: 500,
    status: "pending"
  },
  {
    id: "2",
    title: "Write Blog Post",
    brief: "Article on digital literacy",
    deadline: "2025-10-03",
    payout: 300,
    status: "pending"
  }
];

export default function AvailableJobs() {
  return (
    <div>
      <h2>Available Jobs</h2>
      {mockJobs.map((job) => (
        <div
          key={job.id}
          style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}
        >
          <h3>{job.title}</h3>
          <p>{job.brief}</p>
          <p>Deadline: {job.deadline}</p>
          <p>Payout: KES {job.payout}</p>
          <button>Apply</button>
        </div>
      ))}
    </div>
  );
}
