import React, { useState } from "react";
import { JobDelegationService } from "pulse-connect-core/src/delegation/JobDelegationService";

const service = new JobDelegationService();

export default function SubmissionReviewPanel() {
  const [jobId, setJobId] = useState("");

  const approve = () => {
    service.approveJob(jobId);
    alert("Job approved");
  };

  return (
    <div>
      <h2>Review Submission</h2>
      <input placeholder="Job ID" value={jobId} onChange={(e) => setJobId(e.target.value)} />
      <button onClick={approve}>Approve</button>
    </div>
  );
}
