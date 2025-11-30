import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold text-red-600">Access Denied</h1>
      <p className="mt-4 text-gray-700">
        You don’t have permission to view this page.
      </p>
      <a
        href="/"
        className="mt-6 inline-block text-indigo-600 underline text-sm"
      >
        Return to homepage
      </a>
    </div>
  );
}
