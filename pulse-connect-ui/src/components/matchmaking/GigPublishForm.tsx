"use client";

import { useState } from "react";

interface GigFormData {
  title: string;
  description: string;
  base_price: number;
  currency: string;
}

interface GigPublishResult {
  gig: {
    id: number;
    title: string;
    description: string;
    base_price: number;
    currency: string;
    status: string;
    created_at: string;
  };
  upfront_fee_charged: boolean;
  trace_id: string;
}

export default function GigPublishForm() {
  const [formData, setFormData] = useState<GigFormData>({
    title: "",
    description: "",
    base_price: 0,
    currency: "USD"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<GigPublishResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upfrontFee = Math.round(formData.base_price * 0.05 * 100) / 100; // 5% upfront fee
  const netAmount = formData.base_price - upfrontFee;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "base_price" ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/matchmaking/gigs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": "1" // TODO: Get from auth context
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error("Failed to publish gig");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      base_price: 0,
      currency: "USD"
    });
    setResult(null);
    setError(null);
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Gig Published Successfully!</h2>
          <p className="text-gray-600 mt-2">Your gig is now live and visible to providers.</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Gig Details</h3>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Title:</strong> {result.gig.title}
            </div>
            <div>
              <strong>Description:</strong> {result.gig.description}
            </div>
            <div>
              <strong>Base Price:</strong> ${result.gig.base_price.toLocaleString()}{" "}
              {result.gig.currency}
            </div>
            <div>
              <strong>Status:</strong> {result.gig.status}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Fee Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Gross Amount:</span>
              <span>
                ${result.gig.base_price.toLocaleString()} {result.gig.currency}
              </span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Upfront Fee (5%):</span>
              <span>
                -${upfrontFee.toLocaleString()} {result.gig.currency}
              </span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Net Amount:</span>
              <span>
                ${netAmount.toLocaleString()} {result.gig.currency}
              </span>
            </div>
          </div>
          <div className="mt-4 bg-yellow-50 p-3 rounded">
            <p className="text-xs text-yellow-800">
              <strong>Fee Policy:</strong> 5% upfront fee charged at publication. 15% completion fee
              charged when work is released.
            </p>
          </div>
          <div className="mt-2 text-xs text-blue-600">
            <strong>Trace ID:</strong> {result.trace_id}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={resetForm}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium"
          >
            Publish Another Gig
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Publish a Gig</h2>
        <p className="text-gray-600 mt-2">
          Create a gig to find providers for your project. A 5% upfront fee will be charged to
          ensure quality submissions.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Gig Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Build a React Web Application"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            required
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe your project requirements, deliverables, timeline, and any specific skills needed..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700 mb-2">
              Base Price *
            </label>
            <input
              type="number"
              id="base_price"
              name="base_price"
              value={formData.base_price}
              onChange={handleInputChange}
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1000.00"
            />
          </div>

          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        {formData.base_price > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Fee Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Base Price:</span>
                <span>
                  ${formData.base_price.toLocaleString()} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Upfront Fee (5%):</span>
                <span>
                  -${upfrontFee.toLocaleString()} {formData.currency}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>You'll Pay:</span>
                <span>
                  ${netAmount.toLocaleString()} {formData.currency}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              The upfront fee ensures quality proposals and covers platform costs.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? "Publishing..." : "Publish Gig"}
          </button>
        </div>
      </form>
    </div>
  );
}
