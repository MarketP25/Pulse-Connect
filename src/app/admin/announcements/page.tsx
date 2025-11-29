"use client";

import { useEffect, useState } from "react";

interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  createdBy: string;
  priority: "low" | "medium" | "high";
}

interface AnnouncementResponse {
  announcements: Announcement[];
  total: number;
  page: number;
  limit: number;
}

export default function ViewAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`/api/admin/announcements?page=${page}`);
        if (!response.ok) {
          throw new Error("Failed to fetch announcements");
        }

        const data: AnnouncementResponse = await response.json();

        setAnnouncements((prev) =>
          page === 1 ? data.announcements : [...prev, ...data.announcements]
        );
        setHasMore(data.announcements.length === data.limit);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unexpected error occurred");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [page]);

  const getPriorityColor = (priority: Announcement["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Announcements</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading && page === 1 ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 p-6 rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{announcement.title}</h2>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                    announcement.priority
                  )}`}
                >
                  {announcement.priority.toUpperCase()}
                </span>
              </div>

              <p className="text-gray-600 whitespace-pre-wrap mb-4">
                {announcement.message}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>By: {announcement.createdBy}</span>
                <span>
                  {new Date(announcement.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}

          {!hasMore && announcements.length > 0 && (
            <p className="text-center text-gray-500">
              No more announcements to load.
            </p>
          )}

          {!loading && announcements.length === 0 && (
            <div className="text-center text-gray-500">
              No announcements yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
