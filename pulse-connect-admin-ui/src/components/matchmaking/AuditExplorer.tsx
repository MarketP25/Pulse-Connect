"use client";

import { useState, useEffect } from "react";

interface AuditEvent {
  id: number;
  trace_id: string;
  event_type: string;
  entity_type: string;
  entity_id: number;
  user_id: number;
  action: string;
  details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

interface AuditTrail {
  trace_id: string;
  events: AuditEvent[];
  start_time: string;
  end_time: string;
  duration_ms: number;
  entities_involved: string[];
}

export default function AuditExplorer() {
  const [selectedTraceId, setSelectedTraceId] = useState<string>("");
  const [auditTrail, setAuditTrail] = useState<AuditTrail | null>(null);
  const [recentTraces, setRecentTraces] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentTraces();
  }, []);

  const fetchRecentTraces = async () => {
    try {
      const response = await fetch("/api/admin/matchmaking/audit/recent-traces", {
        headers: {
          "x-admin-user-id": "1" // TODO: Get from auth context
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recent traces");
      }

      const data = await response.json();
      setRecentTraces(data.trace_ids);
    } catch (err) {
      console.error("Failed to load recent traces:", err);
    }
  };

  const fetchAuditTrail = async (traceId: string) => {
    if (!traceId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/matchmaking/audit/trace/${traceId}`, {
        headers: {
          "x-admin-user-id": "1"
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit trail");
      }

      const data = await response.json();
      setAuditTrail(data.trail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit trail");
      setAuditTrail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTraceIdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditTrail(selectedTraceId);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "gig_published":
        return "📝";
      case "brief_created":
        return "📋";
      case "match_generated":
        return "🔍";
      case "proposal_submitted":
        return "📤";
      case "contract_created":
        return "🤝";
      case "milestone_funded":
        return "💰";
      case "milestone_released":
        return "✅";
      case "dispute_created":
        return "⚠️";
      case "fee_charged":
        return "💳";
      default:
        return "📋";
    }
  };

  const getEventColor = (eventType: string) => {
    if (
      eventType.includes("created") ||
      eventType.includes("published") ||
      eventType.includes("submitted")
    ) {
      return "bg-blue-100 text-blue-800";
    }
    if (
      eventType.includes("funded") ||
      eventType.includes("released") ||
      eventType.includes("charged")
    ) {
      return "bg-green-100 text-green-800";
    }
    if (eventType.includes("dispute") || eventType.includes("failed")) {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Audit Explorer</h2>
            <p className="text-sm text-gray-600 mt-1">
              Reconstruct complete flows by trace_id for compliance and debugging
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Trace ID Input */}
        <form onSubmit={handleTraceIdSubmit} className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="traceId" className="block text-sm font-medium text-gray-700 mb-2">
                Trace ID
              </label>
              <input
                type="text"
                id="traceId"
                value={selectedTraceId}
                onChange={(e) => setSelectedTraceId(e.target.value)}
                placeholder="e.g., trace-12345678-1234-1234-1234-123456789abc"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !selectedTraceId.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Explore"}
              </button>
            </div>
          </div>
        </form>

        {/* Recent Traces */}
        {recentTraces.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Trace IDs</h3>
            <div className="flex flex-wrap gap-2">
              {recentTraces.slice(0, 10).map((traceId) => (
                <button
                  key={traceId}
                  onClick={() => {
                    setSelectedTraceId(traceId);
                    fetchAuditTrail(traceId);
                  }}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200"
                >
                  {traceId.slice(-8)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Audit Trail Display */}
        {auditTrail && (
          <div className="space-y-6">
            {/* Trail Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Audit Trail Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Trace ID:</span>
                  <div className="font-mono text-xs bg-white px-2 py-1 rounded border mt-1">
                    {auditTrail.trace_id}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Duration:</span>
                  <div className="font-semibold">{auditTrail.duration_ms}ms</div>
                </div>
                <div>
                  <span className="text-gray-600">Events:</span>
                  <div className="font-semibold">{auditTrail.events.length}</div>
                </div>
                <div>
                  <span className="text-gray-600">Entities:</span>
                  <div className="font-semibold">{auditTrail.entities_involved.length}</div>
                </div>
              </div>
              <div className="mt-3">
                <span className="text-gray-600 text-sm">Entities Involved:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {auditTrail.entities_involved.map((entity, index) => (
                    <span
                      key={index}
                      className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Event Timeline</h3>
              <div className="space-y-4">
                {auditTrail.events.map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-lg">
                        {getEventIcon(event.event_type)}
                      </div>
                      {index < auditTrail.events.length - 1 && (
                        <div className="w-px h-8 bg-gray-300 mt-2"></div>
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {event.event_type
                              .replace("_", " ")
                              .replace(/\b\w/g, (l) => l.toUpperCase())}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {event.entity_type} #{event.entity_id} • User #{event.user_id}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-mono text-gray-500">
                            {formatTimestamp(event.timestamp)}
                          </div>
                          <span
                            className={`inline-block px-2 py-1 text-xs rounded mt-1 ${getEventColor(event.event_type)}`}
                          >
                            {event.action}
                          </span>
                        </div>
                      </div>

                      {/* Event details */}
                      <div className="bg-white rounded border p-3 mt-3">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                      </div>

                      {/* Metadata */}
                      {(event.ip_address || event.user_agent) && (
                        <div className="mt-3 text-xs text-gray-500 bg-gray-100 rounded p-2">
                          {event.ip_address && <div>IP: {event.ip_address}</div>}
                          {event.user_agent && (
                            <div>User Agent: {event.user_agent.slice(0, 100)}...</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!auditTrail && !loading && !error && (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Audit Explorer</h3>
            <p className="text-gray-600">
              Enter a trace ID above to explore the complete audit trail for any transaction or
              flow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
