"use client";

import { useState, useEffect } from "react";

interface Invoice {
  contract_id: number;
  milestone_id?: number;
  gross_amount: number;
  fees: {
    upfront: number;
    completion: number;
  };
  estimated_tax: number;
  net_amount: number;
  currency: string;
  policy_version: string;
}

interface PayoutSummaryProps {
  contractId: number;
  milestoneId?: number;
}

export default function PayoutSummary({ contractId, milestoneId }: PayoutSummaryProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [contractId, milestoneId]);

  const fetchInvoice = async () => {
    try {
      const url = milestoneId
        ? `/api/matchmaking/contracts/${contractId}/invoices?milestone_id=${milestoneId}`
        : `/api/matchmaking/contracts/${contractId}/invoices`;

      const response = await fetch(url, {
        headers: {
          "x-user-id": "1" // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invoice");
      }

      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error || "Failed to load payout summary"}
      </div>
    );
  }

  const totalFees = invoice.fees.upfront + invoice.fees.completion;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4">
        {milestoneId ? "Milestone Payout" : "Contract Summary"}
      </h3>

      <div className="space-y-3">
        {/* Gross Amount */}
        <div className="flex justify-between">
          <span className="text-gray-600">Gross Amount:</span>
          <span className="font-medium">
            ${invoice.gross_amount.toLocaleString()} {invoice.currency}
          </span>
        </div>

        {/* Fees Breakdown */}
        <div className="border-t pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Upfront Fee (5%):</span>
            <span className="text-red-600">
              -${invoice.fees.upfront.toLocaleString()} {invoice.currency}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Completion Fee (15%):</span>
            <span className="text-red-600">
              -${invoice.fees.completion.toLocaleString()} {invoice.currency}
            </span>
          </div>
          <div className="flex justify-between font-medium border-t pt-2 mt-2">
            <span>Total Fees:</span>
            <span className="text-red-600">
              -${totalFees.toLocaleString()} {invoice.currency}
            </span>
          </div>
        </div>

        {/* Estimated Tax */}
        <div className="flex justify-between text-sm border-t pt-3">
          <span className="text-gray-600">Estimated Tax (20%):</span>
          <span className="text-red-600">
            -${invoice.estimated_tax.toLocaleString()} {invoice.currency}
          </span>
        </div>

        {/* Net Amount */}
        <div className="flex justify-between text-lg font-bold border-t pt-3 mt-3">
          <span>Net Amount:</span>
          <span className="text-green-600">
            ${invoice.net_amount.toLocaleString()} {invoice.currency}
          </span>
        </div>
      </div>

      {/* Policy Information */}
      <div className="mt-4 bg-blue-50 p-3 rounded">
        <p className="text-xs text-blue-800">
          <strong>Fee Policy:</strong> {invoice.policy_version}
        </p>
        <p className="text-xs text-blue-600 mt-1">
          5% upfront fee charged at publication, 15% completion fee at payout.
        </p>
      </div>

      {/* Tax Disclaimer */}
      <div className="mt-3 bg-yellow-50 p-3 rounded">
        <p className="text-xs text-yellow-800">
          <strong>Tax Note:</strong> Estimated tax is approximate. Consult a tax professional for
          actual tax obligations.
        </p>
      </div>
    </div>
  );
}
