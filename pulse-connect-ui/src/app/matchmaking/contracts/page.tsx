"use client";

import { useState } from "react";
import ContractView from "@/components/matchmaking/ContractView";
import PayoutSummary from "@/components/matchmaking/PayoutSummary";

export default function ContractsPage() {
  const [selectedContractId, setSelectedContractId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<"client" | "provider">("client");

  // Mock contract list - in real app this would come from API
  const mockContracts = [
    { id: 1, title: "Website Development", status: "active", role: "client" },
    { id: 2, title: "Mobile App Design", status: "completed", role: "provider" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
          <p className="text-gray-600 mt-2">Manage your active contracts and track payments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contract List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Your Contracts</h2>

              <div className="space-y-3">
                {mockContracts.map((contract) => (
                  <div
                    key={contract.id}
                    onClick={() => {
                      setSelectedContractId(contract.id);
                      setUserRole(contract.role as "client" | "provider");
                    }}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedContractId === contract.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <h3 className="font-medium">{contract.title}</h3>
                    <p className="text-sm text-gray-600">Contract #{contract.id}</p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
                        contract.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {contract.status}
                    </span>
                  </div>
                ))}
              </div>

              {mockContracts.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No contracts yet. Create a brief or respond to proposals to get started.
                </p>
              )}
            </div>
          </div>

          {/* Contract Details */}
          <div className="lg:col-span-2">
            {selectedContractId ? (
              <div className="space-y-6">
                <ContractView contractId={selectedContractId} userRole={userRole} />
                <PayoutSummary contractId={selectedContractId} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Contract</h3>
                <p className="text-gray-600">
                  Choose a contract from the list to view details and manage milestones.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
