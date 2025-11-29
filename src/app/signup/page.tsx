"use client";

import { useAuthForm } from "@/hooks/useAuthForm";

export default function SignupPage() {
  const {
    email,
    password,
    error,
    loading,
    setEmail,
    setPassword,
    handleSignup,
  } = useAuthForm();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-indigo-200 px-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSignup}
          className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition"
          aria-label="Sign up form"
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold text-indigo-700">Join Pulse Connect</h1>
            <p className="text-gray-500 text-sm mt-1">Start your journey with smarter marketing</p>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
            required
          />

          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already a member?{" "}
            <a href="/login" className="text-indigo-700 underline">
              Log in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}