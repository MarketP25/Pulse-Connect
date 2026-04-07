"use client";

type Props = {
  contractId: number;
  userRole: "client" | "provider";
};

export default function ContractView({ contractId, userRole }: Props) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Contract #{contractId}</h2>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800">
          {userRole}
        </span>
      </div>

      <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
        <div>
          <p className="font-medium">Status</p>
          <p>Active</p>
        </div>
        <div>
          <p className="font-medium">Milestones</p>
          <p>3 total / 1 completed</p>
        </div>
        <div>
          <p className="font-medium">Contract Value</p>
          <p>$4,200 USD</p>
        </div>
        <div>
          <p className="font-medium">Last Updated</p>
          <p>{new Date().toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-5 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        Contract details are synchronized through the matchmaking and billing services.
        Milestone-level actions remain governed by platform policy and emergency controls.
      </div>
    </section>
  );
}
