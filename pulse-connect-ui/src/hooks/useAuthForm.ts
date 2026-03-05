"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/security/csrf";
import { loginUser } from "@/lib/api/auth";

export function useAuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const deviceFingerprint = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "server-side-device";
    }
    return `${navigator.userAgent}:${navigator.language}:login`;
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const csrfToken = getCsrfToken();
      await loginUser({
        email,
        password,
        csrfToken,
        deviceFingerprint,
      });
      router.push("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    password,
    error,
    loading,
    setEmail,
    setPassword,
    handleLogin,
  };
}
