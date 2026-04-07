"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RegistrationFlow } from "../../../components/auth/RegistrationFlow";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  const handleRegistrationComplete = () => {
    // Simulate signup complete - set session cookie
    document.cookie = `pulse-portal-session=authenticated-user; path=/; max-age=86400; SameSite=Strict`;
    router.push(redirectTo);
  };

  const handleSkipRegistration = () => {
    // Public explorer - allow limited access or home
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <RegistrationFlow
          onRegistrationComplete={handleRegistrationComplete}
          onSkipRegistration={handleSkipRegistration}
        />
      </div>
    </div>
  );
}
