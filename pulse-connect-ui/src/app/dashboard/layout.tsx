"use client";

import { ReactNode, useEffect } from "react";
import { getAuth, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { app } from "@/firebase/config";
import { useRole } from "@/context/RoleContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = getAuth(app);
  const router = useRouter();
  const { role, loading } = useRole();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  useEffect(() => {
    if (!loading && role !== "admin" && role !== "editor") {
      router.replace("/unauthorized");
    }
  }, [role, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Checking access rights…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-indigo-200">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-white/70 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center px-4 py-3">
          <h1 className="text-indigo-700 font-bold text-lg">Pulse Connect</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
