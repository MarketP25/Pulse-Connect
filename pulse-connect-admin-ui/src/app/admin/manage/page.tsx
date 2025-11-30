"use client";

import { useState, useEffect } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionErrorFallback } from "@/components/errors/PermissionErrorFallback";

interface AdminCode {
  email: string;
  code: string;
  createdAt: string;
  lastUsed?: string;
}

export default function AdminPage() {
  const { hasPermission } = usePermissions();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminCodes, setAdminCodes] = useState<AdminCode[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Only super admins can access this page
  if (!hasPermission("admin:manage")) {
    return <PermissionErrorFallback scope="admin:manage" />;
  }

  useEffect(() => {
    fetchAdminCodes();
  }, []);

  const fetchAdminCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch admin codes");
      }

      setAdminCodes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create admin code");
      }

      setSuccess(`Admin code created and sent to ${email}`);
      setEmail("");
      fetchAdminCodes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeCode = async (code: string) => {
    if (!confirm("Are you sure you want to revoke this admin code?")) return;

    try {
      const response = await fetch(`/api/admin/codes/${code}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke admin code");
      }

      setSuccess("Admin code revoked successfully");
      fetchAdminCodes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Management</h1>

      {/* Create Admin Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Admin</h2>
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Admin Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Admin Code"}
          </button>
        </form>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4">
          {success}
        </div>
      )}

      {/* Admin Codes List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Active Admin Codes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {["Email", "Code", "Created At", "Last Used", ""].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adminCodes.map((admin) => (
                <tr key={admin.code}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {admin.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {admin.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {admin.lastUsed
                      ? new Date(admin.lastUsed).toLocaleDateString()
                      : "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleRevokeCode(admin.code)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {adminCodes.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No admin codes available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
