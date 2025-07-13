"use client";
import { useState } from "react";

const API_ENDPOINTS = {
  marketing: "/api/ai/marketing",
  workout:   "/api/ai/workout",
  tutorial:  "/api/ai/tutorial",
  forex:     "/api/ai/forex",
};

type ProgramType = keyof typeof API_ENDPOINTS;

type AIResult = {
  type:    "video" | "audio" | "text" | "short" | "script";
  content: string;
  prompt?: string;
};

const PLAN_REQUIREMENTS: Record<ProgramType, string[]> = {
  marketing: ["basic", "plus", "pro", "patron", "patronTrial"],
  workout:   ["plus", "pro", "patron", "patronTrial"],
  tutorial:  ["pro", "patron", "patronTrial"],
  forex:     ["pro", "patron", "patronTrial"],
};

const PLAN_LABELS: Record<ProgramType, string> = {
  marketing: "Basic",
  workout:   "Plus",
  tutorial:  "Pro",
  forex:     "Pro",
};

export default function AIAssistantPrograms({ userRole }: { userRole: string }) {
  // State
  const [loading, setLoading]           = useState<ProgramType | null>(null);
  const [result, setResult]             = useState<AIResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [history, setHistory]           = useState<AIResult[]>([]);
  const [toast, setToast]               = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [personalization, setPersonalization] = useState<Record<ProgramType, string>>({
    marketing: "",
    workout:   "",
    tutorial:  "",
    forex:     "",
  });

  const [feedback, setFeedback]         = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [complaint, setComplaint]           = useState("");
  const [complaintSent, setComplaintSent]   = useState(false);
  const [inquiry, setInquiry]           = useState("");
  const [inquirySent, setInquirySent]   = useState(false);

  // Helpers
  function hasAccess(type: ProgramType) {
    return PLAN_REQUIREMENTS[type].includes(userRole);
  }

  function renderResultBlock(item: AIResult) {
    switch (item.type) {
      case "video":
      case "short":
        return (
          <video controls className="w-full rounded mt-1">
            <source src={item.content} />
          </video>
        );
      case "audio":
        return (
          <audio controls className="w-full mt-1">
            <source src={item.content} />
          </audio>
        );
      default:
        return (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded px-3 py-2 text-sm whitespace-pre-line mt-1">
            {item.content}
          </div>
        );
    }
  }

  function showToast(message: string, duration = 2000) {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  }

  // API calls
  async function handleAIRequest(type: ProgramType) {
    if (!hasAccess(type)) return;
    setLoading(type);
    setResult(null);
    setError(null);

    try {
      const prompt = personalization[type];
      const res = await fetch(API_ENDPOINTS[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      const aiResult: AIResult = data.result || { type: "text", content: "No result returned.", prompt };
      setResult(aiResult);
      setHistory(prev => [{ ...aiResult, prompt }, ...prev]);
      showToast("AI result generated!");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch AI program. Please try again.");
      showToast("Error fetching AI result.");
    } finally {
      setLoading(null);
    }
  }

  // Copy to clipboard
  function handleCopy(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", 1500);
  }

  // Form submissions
  function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");
    setFeedbackSent(true);
    showToast("Feedback sent!");
  }

  function handleComplaintSubmit(e: React.FormEvent) {
    e.preventDefault();
    setComplaint("");
    setComplaintSent(true);
    showToast("Complaint sent!");
  }

  function handleInquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    setInquiry("");
    setInquirySent(true);
    showToast("Inquiry sent!");
  }

  function renderPlanPrompt(type: ProgramType) {
    if (hasAccess(type)) return null;
    return (
      <p className="mt-1 text-xs text-indigo-600">
        Requires <strong>{PLAN_LABELS[type]}</strong> plan.{" "}
        <a href="/upgrade" className="underline hover:text-indigo-700">
          Upgrade now →
        </a>
      </p>
    );
  }

  return (
    <div className="bg-white border shadow-sm rounded-lg p-6 mb-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <h2 className="text-xl font-semibold text-indigo-700 mb-4">AI Productivity Programs</h2>

      <ul className="space-y-6">
        {(Object.keys(API_ENDPOINTS) as ProgramType[]).map(type => (
          <li key={type}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="text-indigo-800">
                  {type === "forex"
                    ? "Forex AI Powered Classes"
                    : `AI ${type[0].toUpperCase() + type.slice(1)}`}
                </strong>{" "}
                <span className="text-xs text-gray-500">(Requires {PLAN_LABELS[type]}+)</span>
              </div>
              <div className="mt-2 sm:mt-0 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={personalization[type]}
                  placeholder={`e.g. ${
                    type === "workout"
                      ? "Home HIIT"
                      : type === "tutorial"
                      ? "Landing page design"
                      : "Instagram growth"
                  }`}
                  onChange={e =>
                    setPersonalization(prev => ({ ...prev, [type]: e.target.value }))
                  }
                  className="flex-1 border rounded px-2 py-1 text-xs max-w-xs"
                  aria-label={`${type} prompt`}
                />
                <button
                  type="button"
                  onClick={() => handleAIRequest(type)}
                  disabled={loading !== null || !hasAccess(type)}
                  className={`px-4 py-1 rounded text-sm font-semibold transition ${
                    hasAccess(type)
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {loading === type ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2">⏳</span>
                      Loading...
                    </span>
                  ) : {
                      marketing: "Get Campaign Ideas",
                      workout:   "Generate Workout",
                      tutorial:  "Start Learning",
                      forex:     "Start Forex Class",
                    }[type]}
                </button>
              </div>
            </div>
            {renderPlanPrompt(type)}
          </li>
        ))}

        <li>
          <button
            type="button"
            onClick={() => setShowAdvanced(v => !v)}
            className="text-xs text-indigo-600 underline"
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
          </button>
        </li>

        {showAdvanced && (
          <li className="text-sm text-gray-700">
            <strong>AI Tutorial Mode</strong> (Pro+)
            <div className="mt-1">
              <label className="inline-flex items-center">
                <input type="checkbox" className="form-checkbox" />
                <span className="ml-2">Enable deep-dive tutorial sequencing</span>
              </label>
            </div>
          </li>
        )}
      </ul>

      <div className="mt-6 min-h-[3rem]" aria-live="polite">
        {result && (
          <div>
            {renderResultBlock(result)}
            <button
              type="button"
              onClick={() => handleCopy(result.content)}
              className="mt-3 bg-gray-100 text-gray-800 px-3 py-1 rounded text-xs hover:bg-gray-200"
            >
              Copy Result
            </button>
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
            {error}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Previous Results</h3>
          <ul className="space-y-2 max-h-40 overflow-y-auto text-xs">
            {history.map((item, i) => (
              <li key={i} className="bg-gray-50 border rounded px-2 py-2 flex flex-col gap-1">
                {item.prompt && <div className="italic text-gray-500">Prompt: {item.prompt}</div>}
                {renderResultBlock(item)}
                <button
                  type="button"
                  onClick={() => handleCopy(item.content)}
                  className="self-end mt-1 bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs hover:bg-gray-200"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold mb-2 text-indigo-700">Your Feedback</h3>
        <form onSubmit={handleFeedbackSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Share your feedback..."
            maxLength={300}
            required
            className="flex-1 border rounded px-2 py-1 text-sm"
            aria-label="Feedback"
          />
          <button
            type="submit"
            disabled={!feedback.trim()}
            className="bg-indigo-600 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Send
          </button>
        </form>
        {feedbackSent && <div className="mt-2 text-green-600 text-xs">Thank you!</div>}
      </section>

      {/* Complaint */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-red-700">Submit a Complaint</h3>
        <form onSubmit={handleComplaintSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={complaint}
            onChange={e => setComplaint(e.target.value)}
            placeholder="Describe your issue..."
            maxLength={500}
            required
            className="flex-1 border rounded px-2 py-1 text-sm"
            aria-label="Complaint"
          />
          <button
            type="submit"
            disabled={!complaint.trim()}
            className="bg-red-600 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-red-700 transition"
          >
            Submit
          </button>
        </form>
        {complaintSent && <div className="mt-2 text-green-600 text-xs">Received. Thank you!</div>}
      </section>

      {/* Inquiry */}
      <section className="mt-6 mb-8">
        <h3 className="text-sm font-semibold mb-2 text-indigo-700">General Inquiries</h3>
        <form onSubmit={handleInquirySubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inquiry}
            onChange={e => setInquiry(e.target.value)}
            placeholder="Ask a question..."
            maxLength={500}
            required
            className="flex-1 border rounded px-2 py-1 text-sm"
            aria-label="Inquiry"
          />
          <button
            type="submit"
            disabled={!inquiry.trim()}
            className="bg-indigo-500 text-white px-4 py-1 rounded text-sm font-semibold hover:bg-indigo-600 transition"
          >
            Send
          </button>
        </form>
        {inquirySent && <div className="mt-2 text-green-600 text-xs">Received. Thank you!</div>}
      </section>
    </div>
  );
}