"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerificationSuccess() {
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") ?? "";

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <svg
              className="w-12 h-12 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-gray-900">
          Email Verified Successfully
        </h2>

        <p className="mt-2 text-gray-600">
          Your admin account has been verified successfully.
        </p>

        {email && (
          <p className="mt-1 text-sm text-gray-500">
            Email: <span className="font-medium">{email}</span>
          </p>
        )}

        <div className="mt-6">
          <Link
            href="/admin/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
