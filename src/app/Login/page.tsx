"use client";

import { useAuthForm } from "@/hooks/useAuthForm";

export default function LoginPage() {
  const {
    email,
    password,
    error,
    loading,
    setEmail,
    setPassword,
    handleLogin,
  } = useAuthForm();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200 flex items-center justify-center px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
        aria-label="Login form"
      >
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-indigo-700">
            Pulse Connect
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Your digital marketing command center
          </p>
        </div>

        <h2 className="text-2xl font-bold mb-6 text-center">
          Sign In to Pulse Connect
        </h2>

        <input
          id="email"
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        <input
          id="password"
          type="password"
          placeholder="Password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded"
          required
        />

        {error && (
          <p className="text-red-500 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-center mt-4">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
