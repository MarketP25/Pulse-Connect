export default function VerificationError() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 p-3">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-bold text-gray-900">Verification Failed</h2>

        <p className="mt-2 text-gray-600">
          We couldn't verify your admin account. The verification link may have expired or is
          invalid.
        </p>

        <div className="mt-6 space-y-4">
          <a
            href="/admin/register"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Registering Again
          </a>

          <div className="text-sm">
            <a href="/contact" className="font-medium text-blue-600 hover:text-blue-500">
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
