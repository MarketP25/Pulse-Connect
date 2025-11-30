// src/app/dashboard/AIAssistantPrograms.tsx
"use client";

import React, { useState, useEffect } from "react";

type ProgramType = "marketing" | "workout" | "tutorial" | "forex";

const ENDPOINTS: Record<ProgramType, string> = {
  marketing: "/api/ai/marketing",
  workout: "/api/ai/workout",
  tutorial: "/api/ai/tutorial",
  forex: "/api/ai/forex",
};

const PLAN_REQUIREMENTS: Record<ProgramType, string[]> = {
  marketing: ["basic", "plus", "pro", "patron", "patronTrial"],
  workout: ["plus", "pro", "patron", "patronTrial"],
  tutorial: ["pro", "patron", "patronTrial"],
  forex: ["pro", "patron", "patronTrial"],
};

const PLAN_LABELS: Record<ProgramType, string> = {
  marketing: "Basic",
  workout: "Plus",
  tutorial: "Pro",
  forex: "Pro",
};

interface AIResult {
  type: "video" | "audio" | "text" | "short" | "script";
  content: string;
  prompt?: string;
}

interface LastUsed {
  program: ProgramType;
  prompt: string;
  time: number;
}

export default function AIAssistantPrograms({
  userRole,
}: {
  userRole: string;
}) {
  const [loading, setLoading] = useState<ProgramType | null>(null);
  const [result, setResult] = useState<AIResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AIResult[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [prompts, setPrompts] = useState<Record<ProgramType, string>>({
    marketing: "",
    workout: "",
    tutorial: "",
    forex: "",
  });
  const [lastUsed, setLastUsed] = useState<LastUsed | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [complaint, setComplaint] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);
  const [inquiry, setInquiry] = useState("");
  const [inquirySent, setInquirySent] = useState(false);

  useEffect(() => {
    // Only non-sensitive UI state is stored in localStorage
    const raw = localStorage.getItem(`pc-lastUsed-${userRole}`);
    if (raw) {
      try {
        setLastUsed(JSON.parse(raw));
      } catch {}
    }
  }, [userRole]);

  const hasAccess = (t: ProgramType) => PLAN_REQUIREMENTS[t].includes(userRole);

  const showToast = (msg: string, duration = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  };

  async function downloadMedia(url: string, filename: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      showToast("Could not download file.", 2000);
    }
  }

  function handleCopy(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard!", 1500);
  }

  function renderResultBlock(item: AIResult) {
    if (item.type === "video" || item.type === "short") {
      return (
        <div>
          <video controls className="w-full rounded mt-2">
            <source src={item.content} />
          </video>
          <button
            type="button"
            onClick={() => downloadMedia(item.content, "video.mp4")}
            className="mt-2 px-3 py-1 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200"
          >
            Download Video
          </button>
        </div>
      );
    }
    if (item.type === "audio") {
      return (
        <div>
          <audio controls className="w-full mt-2">
            <source src={item.content} />
          </audio>
          <button
            type="button"
            onClick={() => downloadMedia(item.content, "audio.mp3")}
            className="mt-2 px-3 py-1 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200"
          >
            Download Audio
          </button>
        </div>
      );
    }
    return (
      <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded px-3 py-2 mt-2 text-sm whitespace-pre-line">
        {item.content}
      </div>
    );
  }

  async function handleGenerate(type: ProgramType) {
    if (!hasAccess(type)) return;
    setLoading(type);
    setResult(null);
    setError(null);

    try {
      const prompt = prompts[type];
      const res = await fetch(ENDPOINTS[type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error();
      const data: { result?: AIResult } = await res.json();
      const aiResult = data.result || {
        type: "text",
        content: "No result returned.",
        prompt,
      };
      setResult(aiResult);
      setHistory((prev) => [{ ...aiResult, prompt }, ...prev]);

      const lu: LastUsed = { program: type, prompt, time: Date.now() };
      setLastUsed(lu);
      // Only non-sensitive UI state is stored in localStorage
      localStorage.setItem(`pc-lastUsed-${userRole}`, JSON.stringify(lu));

      showToast("AI result generated!");
    } catch {
      setError("Failed to fetch AI program. Please try again.");
      showToast("Error fetching AI result.");
    } finally {
      setLoading(null);
    }
  }

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

  const formatTime = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-8 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <h2 className="text-2xl font-semibold text-indigo-700 mb-4">
        AI Productivity Programs
      </h2>

      {/* Last Used */}
      {lastUsed && (
        <div className="mb-4 flex justify-between items-center text-sm text-gray-700">
          <div>
            Last used <strong>{lastUsed.program}</strong> at{" "}
            {formatTime(lastUsed.time)}.
          </div>
          <button
            type="button"
            onClick={() => handleGenerate(lastUsed.program)}
            disabled={!hasAccess(lastUsed.program)}
            className={`px-3 py-1 rounded text-sm font-semibold ${
              hasAccess(lastUsed.program)
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Repeat
          </button>
        </div>
      )}

      {/* Program List */}
      <ul className="space-y-6">
        {(Object.keys(ENDPOINTS) as ProgramType[]).map((type) => (
          <li key={type}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <strong className="text-indigo-800">
                  {type === "forex"
                    ? "Forex AI Powered Classes"
                    : `AI ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                </strong>{" "}
                <span className="text-xs text-gray-500">
                  (Requires {PLAN_LABELS[type]})
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={prompts[type]}
                  onChange={(e) =>
                    setPrompts((prev) => ({ ...prev, [type]: e.target.value }))
                  }
                  placeholder={`e.g. ${
                    type === "workout"
                      ? "Home HIIT"
                      : type === "tutorial"
                        ? "Landing page design"
                        : "Instagram growth"
                  }`}
                  className="border rounded px-2 py-1 text-xs"
                  aria-label={`${type} prompt`}
                />
                {hasAccess(type) ? (
                  <button
                    type="button"
                    onClick={() => handleGenerate(type)}
                    disabled={loading === type}
                    className="px-4 py-1 bg-indigo-600 text-white rounded text-sm font-semibold hover:bg-indigo-700 transition"
                  >
                    {loading === type ? "⏳ Generating" : "Generate"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/pricing")}
                    className="px-4 py-1 underline text-indigo-600 text-sm"
                  >
                    Upgrade to {PLAN_LABELS[type]}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}

        {/* Advanced Toggle */}
        <li>
          <button
            id="advanced-toggle"
            type="button"
            aria-expanded="true"
            aria-controls="advanced-options"
            onClick={() => setAdvanced((prev) => !prev)}
            className="text-xs underline text-indigo-600"
          >
            {advanced ? "Hide Advanced Options" : "Show Advanced Options"}
          </button>
        </li>
      </ul>

      {/* Advanced Options Panel */}
      {advanced && (
        <section
          id="advanced-options"
          role="region"
          aria-labelledby="advanced-toggle"
          className="mt-4 p-4 bg-gray-50 rounded text-sm text-gray-700 flex flex-col gap-2"
        >
          <ul className="flex flex-col gap-2">
            <li>
              <label
                htmlFor="deep-dive-mode"
                className="inline-flex items-center"
              >
                <input
                  id="deep-dive-mode"
                  type="checkbox"
                  className="form-checkbox"
                  aria-label="Enable deep-dive tutorial mode"
                />
                <span className="ml-2">
                  Enable deep-dive tutorial mode (Pro+)
                </span>
              </label>
            </li>
            {/* …add more <li> items here */}
          </ul>
        </section>
      )}

      {/* AI Result & Error */}
      <div className="mt-6 min-h-[4rem]" aria-live="polite">
        {result ? (
          <>
            {renderResultBlock(result)}
            <button
              type="button"
              onClick={() => handleCopy(result.content)}
              className="mt-2 text-xs underline text-gray-700"
            >
              Copy Result
            </button>
          </>
        ) : error ? (
          <div className="mt-2 px-3 py-2 rounded bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        ) : null}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Previous Results
          </h3>
          <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
            {history.map((h, i) => (
              <li key={i} className="bg-gray-50 border rounded p-2">
                {h.prompt && (
                  <div className="italic text-gray-500">Prompt: {h.prompt}</div>
                )}
                {renderResultBlock(h)}
                <button
                  type="button"
                  onClick={() => handleCopy(h.content)}
                  className="mt-1 text-xs underline text-gray-700"
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback Form */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold mb-2 text-indigo-700">
          Your Feedback
        </h3>
        <form onSubmit={handleFeedbackSubmit} className="flex gap-2">
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your feedback..."
            required
            maxLength={300}
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
        {feedbackSent && (
          <div className="mt-2 text-green-600 text-xs">
            Thank you for your feedback!
          </div>
        )}
      </section>

      {/* Complaint Form */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-red-700">
          Submit a Complaint
        </h3>
        <form onSubmit={handleComplaintSubmit} className="flex gap-2">
          <input
            type="text"
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Describe your issue..."
            required
            maxLength={500}
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
        {complaintSent && (
          <div className="mt-2 text-green-600 text-xs">
            Your complaint has been received. Thank you!
          </div>
        )}
      </section>

      {/* Inquiry Form */}
      <section className="mt-6 mb-8">
        <h3 className="text-sm font-semibold mb-2 text-indigo-700">
          General Inquiries
        </h3>
        <form onSubmit={handleInquirySubmit} className="flex gap-2">
          <input
            type="text"
            value={inquiry}
            onChange={(e) => setInquiry(e.target.value)}
            placeholder="Ask a question..."
            required
            maxLength={500}
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
        {inquirySent && (
          <div className="mt-2 text-green-600 text-xs">
            Your inquiry has been received. Thank you!
          </div>
        )}
      </section>
    </div>
  );
}
