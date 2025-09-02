"use client";

import { useAuthForm } from "@/hooks/useAuthForm";
import FeatureGate from "@/components/FeatureGate";

export default function LoginForm() {
  const { email, password, error, loading, setEmail, setPassword, handleLogin } = useAuthForm();

  return (
    <FeatureGate permission="users:read">
      <form
        onSubmit={handleLogin}
        className="max-w-sm mx-auto p-6 bg-white rounded shadow-md flex flex-col gap-4"
        aria-label="Login to Pulse Connect"
      >
        <h2 className="text-xl font-bold text-indigo-700">Login</h2>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          required
          className="border rounded px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white py-2 rounded font-semibold hover:bg-indigo-700 transition"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </FeatureGate>
  );
}
