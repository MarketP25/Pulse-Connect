import React, { useState } from 'react';
import { JobDelegationService } from 'pulse-connect-core/src/delegation/JobDelegationService';

const service = new JobDelegationService();

export default function TaskAssignmentPanel() {
  const [jobId, setJobId] = useState('');
  const [contributorId, setContributorId] = useState('');

  const assign = () => {
    service.assignJob(jobId, contributorId);
    alert('Job assigned successfully');
  };

  return (
    <div>
      <h2>Assign Job</h2>
      <input placeholder="Job ID" value={jobId} onChange={e => setJobId(e.target.value)} />
      <input placeholder="Contributor ID" value={contributorId} onChange={e => setContributorId(e.target.value)} />
      <button onClick={assign}>Assign</button>
    </div>
  );
}